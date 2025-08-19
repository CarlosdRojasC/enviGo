const PDFDocument = require('pdfkit');
const axios = require('axios');

class PdfService {
    // Función para descargar una imagen como buffer
    async fetchImage(url) {
        try {
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            return response.data;
        } catch (error) {
            console.error(`Error al descargar imagen: ${url}`, error.message);
            return null;
        }
    }

    async generateProofOfDelivery(order) {
        return new Promise(async (resolve) => {
            const doc = new PDFDocument({ margin: 50, bufferPages: true });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // --- Encabezado ---
            doc.fontSize(20).font('Helvetica-Bold').text('Comprobante de Entrega', { align: 'center' });
            doc.fontSize(12).font('Helvetica').text(`Pedido #${order.order_number}`, { align: 'center' });
            doc.moveDown(2);

            // --- Detalles ---
            doc.fontSize(10).font('Helvetica')
               .text(`Cliente: ${order.customer_name}`)
               .text(`Dirección: ${order.shipping_address}, ${order.shipping_commune}`)
               .text(`Fecha: ${new Date(order.delivery_date).toLocaleString('es-CL')}`);
            doc.moveDown(2);

            const proof = order.proof_of_delivery;

            // --- Añadir Fotos ---
            const photoUrls = proof?.podUrls || [];
            if (proof?.photo_url && !photoUrls.includes(proof.photo_url)) {
                photoUrls.unshift(proof.photo_url); // Añadir la foto principal si no está en la lista
            }

            if (photoUrls.length > 0) {
                doc.fontSize(14).font('Helvetica-Bold').text('Fotos de Entrega');
                doc.moveDown();
                for (const url of photoUrls) {
                    const imageBuffer = await this.fetchImage(url);
                    if (imageBuffer) {
                        if (doc.y + 100 > doc.page.height - 50) doc.addPage();
                        doc.image(imageBuffer, { width: 150 });
                        doc.moveDown();
                    }
                }
            }

            // --- Añadir Firma ---
            if (order.signatureUrl) {
                if (doc.y + 100 > doc.page.height - 50) doc.addPage();
                doc.fontSize(14).font('Helvetica-Bold').text('Firma del Receptor');
                doc.moveDown();
                const signatureBuffer = await this.fetchImage(order.signatureUrl);
                if (signatureBuffer) {
                    doc.image(signatureBuffer, { width: 200 });
                }
            }

            doc.end();
        });
    }
}

module.exports = new PdfService();