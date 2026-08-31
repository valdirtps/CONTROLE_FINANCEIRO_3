const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable").default || require("jspdf-autotable");

const doc = new jsPDF();
autoTable(doc, {
  head: [['A', 'B']],
  body: [['1', '2']]
});
console.log("lastAutoTable:", !!doc.lastAutoTable);
console.log("autoTable.previous:", !!(doc.autoTable && doc.autoTable.previous));
