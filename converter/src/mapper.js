const { create } = require('xmlbuilder2');

function mapToCamt055(pain001Data, options = {}) {
    const {
        assgnmtId = `RÜCKRUF_${Date.now()}`, //noch unsicher welcher Wert, Rückfrage gestellt 
        cxlReason = 'CUST', //bei Bank/Zahlbarmachung immer dieser Wert, kann theoretisch festcodiert bleiben
        pmtInfCxl = false, //zur Zeit kann das so bleiben, weil nie ganze Nachrichten zurückgerufen werden (sonst anpassen)
    } = options;

    const root = create({
        Document: {
            '@xmlns': 'urn:iso:std:iso:20022:tech:xsd:camt.055.001.05',
            '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
            '@xsi:schemaLocation': 'urn:iso:std:iso:20022:tech:xsd:camt.055.001.05 camt.055.001.05.xsd',
            CstmrPmtCxlReq: {
                Assgnmt: {
                    Id: assgnmtId,
                    Assgnr: {
                        Pty: {
                            Nm: pain001Data.initgPty?.Nm,
                        },
                    },
                    Assgne: {
                        Agent: {
                            FinInstnId: {
                                BICFI: pain001Data.pmtInfs[0]?.dbtrAgt?.FinInstnId?.BICFI,
                            },
                        },
                    },
                    CreDtTm: new Date().toISOString().replace('Z', '+00:00'),
                },

                Undrlyg: [{
                    OrgnlPmtInfAndCxl: {
                        Case: {
                            Id: `${pain001Data.msgId}_${Date.now()}`,
                            Cretr: {
                                Pty: {
                                    Nm: pain001Data.pmtInfs[0]?.dbtr?.Nm || pain001Data.initgPty?.Nm,
                                    Id: {
                                        OrgId: {
                                            Othr: {
                                                Id: pain001Data.pmtInfs[0]?.dbtrAcct?.Id?.IBAN,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        OrgnlPmtInfId: pain001Data.pmtInfs[0]?.pmtInfId,
                        OrgnlGrpInf: {
                            OrgnlMsgId: pain001Data.msgId,
                            OrgnlMsgNmId: pain001Data.orgnlMsgNmId || 'pain.001.001.09',

                        },
 
                        NbOfTxs: pain001Data.nbOfTxs,
                        CtrlSum: pain001Data.ctrlSum,
                        PmtInfCxl: pmtInfCxl,

                        TxInf: pain001Data.pmtInfs.flatMap((pmtInf) =>
                            pmtInf.txInfs.map((tx) => ({
                                OrgnlEndToEndId: tx.endToEndId,
                                OrgnlInstdAmt: {
                                    '@Ccy': tx.ccy || 'EUR',
                                    '#text': tx.amt,
                                },
                                OrglReqdExctnDt: pmtInf.reqdExctnDt || pain001Data.reqdExctnDt || '',
                                CxlRsnIn: { 
                                    Rsn: {
                                        Cd: cxlReason,
                                    },
                                },
                                OrgnlTxRef: {
                                    ...(tx.cdtr?.Nm && {
                                        Cdtr: {
                                            Nm: tx.cdtr.Nm,
                                        },
                                    }),
                                    ...(tx.cdtrAcct && {
                                        CdtrAcct: {
                                            Id: {
                                                IBAN: tx.cdtrAcct.Id?.IBAN,
                                            },
                                        },
                                    }),
                                },
                            }))
                        ),
                    },
                }],
            },
        },
    });

    const xmlString = root.end({ prettyPrint: true });
    return xmlString;
}

module.exports = { mapToCamt055 };