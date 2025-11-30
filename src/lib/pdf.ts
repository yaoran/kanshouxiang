import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generatePDF = async (elementIds: string[], fileName: string = 'hand-analysis-report.pdf') => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10; // mm
  const contentWidth = pageWidth - margin * 2;

  let currentY = margin;

  for (let i = 0; i < elementIds.length; i++) {
    const element = document.getElementById(elementIds[i]);
    if (!element) continue;

    // Temporarily ensure background color is correct for screenshot
    const originalBg = element.style.backgroundColor;
    // Force a dark background if transparent, to match theme
    if (!originalBg || originalBg === 'rgba(0, 0, 0, 0)' || originalBg === 'transparent') {
       // We rely on the element's own styling mostly, but html2canvas needs a base
       // element background is usually set by class, but let's be safe
    }

    const canvas = await html2canvas(element, {
      scale: 2, // High resolution
      useCORS: true, // Allow cross-origin images
      logging: false,
      backgroundColor: '#050505', // Match main background color
      windowWidth: element.scrollWidth,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Check if we need a new page
    if (currentY + imgHeight > pageHeight - margin) {
      pdf.addPage();
      currentY = margin;
    }

    pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
    currentY += imgHeight + 10; // Add some spacing between sections
  }

  pdf.save(fileName);
};


