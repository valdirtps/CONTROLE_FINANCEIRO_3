const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable").default || require("jspdf-autotable");

const doc = new jsPDF({
  orientation: 'landscape',
  unit: 'mm',
  format: 'a4'
});

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
  ]
});

doc.save('test_multi_row.pdf');
console.log("Multi-row pdf generated");
