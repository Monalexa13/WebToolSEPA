const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { parsePain001 } = require('./src/parser');
const { mapToCamt055 } = require('./src/mapper');

const app = express();
const PORT = process.env.PORT || 3000;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const downloadCache = new Map();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.post('/preview', upload.single('inputFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Keine Datei hochgeladen.'
            });
        }

        const xmlString = req.file.buffer.toString('utf-8');

        if (!xmlString.includes('<CstmrCdtTrfInitn>')) {
            return res.status(400).json({
                success: false,
                error: 'Die hochgeladene Datei ist keine gültige pain.001-Datei.'
            });
        }

        const parsedData = await parsePain001(xmlString);

        if (!parsedData.pmtInfs || parsedData.pmtInfs.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Keine Payment Information Blöcke in der Datei gefunden.'
            });
        }

        const transactions = [];
        parsedData.pmtInfs.forEach((pmtInf) => {
            pmtInf.txInfs.forEach((tx, index) => {
                transactions.push({
                    id: index,
                    endToEndId: tx.endToEndId || '',
                    dbtrNm: pmtInf.dbtr?.Nm || '',
                    cdtrIBAN: tx.cdtrAcct.Id?.IBAN,
                    cdtrNm: tx.cdtr?.Nm || '',
                    amt: `${tx.amt || '0'} ${tx.ccy || 'EUR'}`,
                    originalData: tx,
                    pmtInfData: pmtInf
                });
            });
        });

        res.json({
            success: true,
            transactions: transactions,
            msgId: parsedData.msgId,
            nbOfTxs: parsedData.nbOfTxs,
            ctrlSum: parsedData.ctrlSum,
            reqdExctnDt: parsedData.reqdExctnDt || parsedData.pmtInfs?.[0]?.reqdExctnDt || null,
            orgnlMsgNmId: parsedData.orgnlMsgNmId || 'pain.001.001.09'
        });

    } catch (error) {
        console.error('Fehler beim Parsen der Datei:', error);
        res.status(500).json({
            success: false,
            error: 'Fehler beim Parsen: ' + error.message
        });
    }
});

app.post('/convert', async (req, res) => {
    try {
        if (!req.body.pain001Data) {
            return res.status(400).json({
                success: false,
                error: 'Keine Transaktionsdaten empfangen.'
            });
        }

        const camt055Xml = mapToCamt055(req.body.pain001Data, req.body.options || {});

        const fileId = crypto.randomBytes(16).toString('hex');
        downloadCache.set(fileId, {
            filename: `camt_055_${Date.now()}.xml`,
            content: camt055Xml
        });

        res.json({
            success: true,
            downloadUrl: `/download/${fileId}`
        });

    } catch (error) {
        console.error('Fehler bei der Konvertierung:', error);
        res.status(500).json({
            success: false,
            error: 'Fehler bei der Konvertierung: ' + error.message
        });
    }
});

app.get('/download/:id', (req, res) => {
    const fileData = downloadCache.get(req.params.id);
    if (!fileData) {
        return res.status(404).send('Datei nicht gefunden oder Download-Link abgelaufen.');
    }
    res.setHeader('Content-Disposition', `attachment; filename=${fileData.filename}`);
    res.setHeader('Content-Type', 'application/xml');
    res.send(fileData.content);
    downloadCache.delete(req.params.id);
});

app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});