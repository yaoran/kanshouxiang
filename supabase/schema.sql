-- 1. Profiles Table (用户信息与余额)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  credits int default 0, -- 剩余测算次数
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- RLS Policies
create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, credits)
  values (new.id, new.email, 2); -- 注册赠送 2 次体验 (可选，或者0)
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Packages Table (套餐配置)
create table public.packages (
  id serial primary key,
  name text not null,
  price numeric(10, 2) not null, -- 价格 (元)
  credits int not null, -- 包含次数
  limit_per_user int default null, -- 每人限购次数 (null 为不限)
  is_active boolean default true
);

-- Insert default packages
insert into public.packages (name, price, credits, limit_per_user) values
('体验套餐', 5.90, 2, 1),
('标准套餐', 39.90, 8, null),
('尊享套餐', 99.90, 25, null);

alter table public.packages enable row level security;
create policy "Packages are viewable by everyone." on public.packages for select using (true);


-- 3. Orders Table (订单)
create table public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  package_id int references public.packages not null,
  amount numeric(10, 2) not null,
  status text not null default 'pending', -- pending, paid, failed
  out_trade_no text unique, -- 微信支付订单号
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.orders enable row level security;
create policy "Users can view own orders." on public.orders for select using (auth.uid() = user_id);


-- 4. Usages Table (消耗记录)
create table public.usages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  feature text not null, -- e.g., 'palm_reading'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.usages enable row level security;
create policy "Users can view own usages." on public.usages for select using (auth.uid() = user_id);


-- =============================================
-- RPC Functions (数据库函数)
-- =============================================

-- Check if user can purchase a limited package
-- Returns: true if allowed, false if limit reached
create or replace function check_purchase_limit(p_user_id uuid, p_package_id int)
returns boolean as $$
declare
  v_limit int;
  v_count int;
begin
  -- Get limit for the package
  select limit_per_user into v_limit from public.packages where id = p_package_id;
  
  -- If no limit, return true
  if v_limit is null then
    return true;
  end if;

  -- Count successful orders for this package by this user
  select count(*) into v_count 
  from public.orders 
  where user_id = p_user_id 
  and package_id = p_package_id 
  and status = 'paid';

  return v_count < v_limit;
end;
$$ language plpgsql security definer;


-- Handle successful payment (Update order status and add credits)
-- Usually called by the webhook handler with service_role key
create or replace function handle_payment_success(p_out_trade_no text)
returns void as $$
declare
  v_order record;
  v_credits int;
begin
  -- Get order details
  select * into v_order from public.orders where out_trade_no = p_out_trade_no;
  
  if v_order is null then
    raise exception 'Order not found';
  end if;

  if v_order.status = 'paid' then
    return; -- Already processed
  end if;

  -- Get credits amount from package
  select credits into v_credits from public.packages where id = v_order.package_id;

  -- Update order status
  update public.orders set status = 'paid', updated_at = now() where id = v_order.id;

  -- Add credits to user profile
  update public.profiles 
  set credits = credits + v_credits 
  where id = v_order.user_id;
end;
$$ language plpgsql security definer;


-- Deduct credit for usage (Atomic operation)
-- Returns: true if success, false if insufficient balance
create or replace function deduct_credit(p_user_id uuid)
returns boolean as $$
declare
  v_credits int;
begin
  -- Lock row for update
  select credits into v_credits from public.profiles where id = p_user_id for update;
  
  if v_credits > 0 then
    update public.profiles set credits = credits - 1 where id = p_user_id;
    insert into public.usages (user_id, feature) values (p_user_id, 'palm_reading');
    return true;
  else
    return false;
  end if;
end;
$$ language plpgsql security definer;


