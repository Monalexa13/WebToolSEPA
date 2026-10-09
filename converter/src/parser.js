const { XMLParser } = require('fast-xml-parser');

async function parsePain001(xmlString) {
    try {
        const options = {
            ignoreAttributes: false,
            attributeNamePrefix: "@",
            parseTagValue: false,
            parseAttributeValue: false,
            trimValues: true,
            arrayMode: false,
        };

        const parser = new XMLParser(options);
        const result = parser.parse(xmlString);

        const document = result.Document || result;
        const documentNamespace = document["@xmlns"] || "urn:iso:std:iso:20022:tech:xsd:pain.001.001.09";
        const cstmrCdtTrfInitn = document.CstmrCdtTrfInitn || document;

        const grpHdr = cstmrCdtTrfInitn.GrpHdr;
        const msgId = grpHdr.MsgId;
        const nbOfTxs = grpHdr.NbOfTxs;
        const ctrlSum = grpHdr.CtrlSum;
        const initgPty = grpHdr.InitgPty;

        let grpHdrReqdExctnDt;
        if (grpHdr.ReqdExctnDt) {
            if (typeof grpHdr.ReqdExctnDt === 'string') {
                grpHdrReqdExctnDt = grpHdr.ReqdExctnDt;
            } else if (grpHdr.ReqdExctnDt.Dt) {
                grpHdrReqdExctnDt = grpHdr.ReqdExctnDt.Dt;
            }
        }

        const pmtInf = cstmrCdtTrfInitn.PmtInf;
        const pmtInfList = Array.isArray(pmtInf) ? pmtInf : [pmtInf];

        const parsedPmtInfs = pmtInfList.map((pmt) => {
            const pmtInfId = pmt.PmtInfId;
            const nbOfTxsPmt = pmt.NbOfTxs;
            const ctrlSumPmt = pmt.CtrlSum;
            let reqdExctnDt;
            if (pmt.ReqdExctnDt) {
                if (typeof pmt.ReqdExctnDt === 'string') {
                    reqdExctnDt = pmt.ReqdExctnDt;
                } else if (pmt.ReqdExctnDt.Dt) {
                    reqdExctnDt = pmt.ReqdExctnDt.Dt;
                }
            }
            const dbtrAgt = pmt.DbtrAgt;
            const cdtrAgt = pmt.CdtrAgt;
            const dbtr = pmt.Dbtr;
            const dbtrAcct = pmt.DbtrAcct;

            const parsedTxInfs = [];

            if (pmt.CdtTrfTxInf) {
                const cdtTrfTxInfList = Array.isArray(pmt.CdtTrfTxInf) ? pmt.CdtTrfTxInf : [pmt.CdtTrfTxInf];
                cdtTrfTxInfList.forEach((tx) => {
                    let amtValue, ccy;
                    if (tx.Amt) {
                        if (tx.Amt.InstdAmt) {
                            amtValue = tx.Amt.InstdAmt["#text"] || tx.Amt.InstdAmt;
                            ccy = tx.Amt.InstdAmt["@Ccy"] || tx.Amt["@Ccy"];
                        }
                    }
            
                    const instrId = tx.PmtId?.InstrId;
                    const endToEndId = tx.PmtId?.EndToEndId;
            
                    parsedTxInfs.push({
                        instrId: instrId,
                        endToEndId: endToEndId,
                        amt: amtValue,
                        ccy: ccy,
                        dbtr: dbtr,
                        dbtrAcct: dbtrAcct,
                        dbtrAgt: dbtrAgt,
                        cdtr: tx.Cdtr,
                        cdtrAcct: tx.CdtrAcct,
                        cdtrAgt: tx.CdtrAgt,
                    });
                });
            }

            return {
                pmtInfId,
                nbOfTxs: nbOfTxsPmt,
                ctrlSum: ctrlSumPmt,
                reqdExctnDt,
                dbtrAgt,
                cdtrAgt,
                dbtr,
                dbtrAcct,
                txInfs: parsedTxInfs,
            };
        });

        return {
            msgId,
            nbOfTxs,
            ctrlSum,
            initgPty,
            reqdExctnDt: grpHdrReqdExctnDt,
            pmtInfs: parsedPmtInfs,
            orgnlMsgNmId: documentNamespace,
        };
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports = { parsePain001 };