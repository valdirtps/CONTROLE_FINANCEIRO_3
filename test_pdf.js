const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable").default || require("jspdf-autotable");

const doc = new jsPDF({
  orientation: 'landscape',
  unit: 'mm',
  format: 'a4'
});

const totalValor = 1000;
const totalDevedor = 200;
const totalLiquido = totalValor - totalDevedor;

autoTable(doc, {
  startY: 35,
  head: [['Vencimento', 'Conta', 'Parcela', 'Valor Parcela', 'Referente', 'Devedor', 'Valor Devedor']],
  body: [
    ['01/01/2026', 'Conta 1', '1/1', '1000.00', 'Ref', 'Dev', '200.00']
  ],
  foot: [
    [
      { content: 'TOTAL GERAL:', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: '1000.00', styles: { fontStyle: 'bold' } },
      { content: '', colSpan: 2 },
      { content: '200.00', styles: { fontStyle: 'bold' } }
    ],
    [
      { content: 'TOTAL LÍQUIDO A PAGAR:', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: '800.00', styles: { fontStyle: 'bold', textColor: [5, 150, 105] } },
      { content: '', colSpan: 3 }
    ]
  ],
  theme: 'grid',
  headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
  bodyStyles: { fontSize: 8 },
  footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 8 },
  columnStyles: {
    3: { halign: 'right' },
    6: { halign: 'right' }
  }
});

doc.save('test.pdf');
console.log("PDF generated");
