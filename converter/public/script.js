document.getElementById('converterForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const fileInput = document.getElementById('input');
    const file = fileInput.files[0]; 

    if (!file) {
        alert('Bitte wählen Sie eine Datei aus.');
        return;
    }

    const formData = new FormData();
    formData.append('inputFile', file);

    try {
        const previewResponse = await fetch('/preview', {
            method: 'POST',
            body: formData,
        });

        const previewData = await previewResponse.json();

        if (previewData.success) {
            const tableBody = document.getElementById('tableBody');
            tableBody.innerHTML = '';

            previewData.transactions.forEach((tx) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><input type="checkbox" class="tx-checkbox" data-id="${tx.id}"></td>
                    <td>${tx.endToEndId}</td>
                    <td>${tx.cdtrIBAN}</td>
                    <td>${tx.cdtrNm}</td>
                    <td>${tx.amt}</td>
                `;
                tableBody.appendChild(row);
            });

            document.getElementById('resultContainer').style.display = 'block';
            document.getElementById('convertButtonContainer').style.display = 'block';
            window.previewData = previewData;
        } else {
            alert('Fehler beim Parsen der Datei: ' + (previewData.error || 'Unbekannter Fehler'));
        }
    } catch (error) {
        alert('Fehler bei der Kommunikation mit dem Server: ' + error.message);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const convertButtonContainer = document.createElement('div');
    convertButtonContainer.id = 'convertButtonContainer';
    convertButtonContainer.style.marginTop = '20px';
    convertButtonContainer.style.display = 'none';

    const convertButton = document.createElement('button');
    convertButton.textContent = 'Ausgewählte Transaktionen konvertieren';
    convertButton.type = 'button';
    convertButton.addEventListener('click', async () => {
        const checkboxes = document.querySelectorAll('.tx-checkbox:checked');
        const selectedTxIds = Array.from(checkboxes).map(cb => parseInt(cb.getAttribute('data-id')));

        if (selectedTxIds.length === 0) {
            alert('Bitte wählen Sie mindestens eine Transaktion aus.');
            return;
        }

        const selectedTransactions = window.previewData.transactions.filter(tx =>
            selectedTxIds.includes(tx.id)
        );

        const filteredPain001Data = {
            msgId: window.previewData.msgId,
            creDtTm: new Date().toISOString(),
            nbOfTxs: window.previewData.nbOfTxs,
            ctrlSum: window.previewData.ctrlSum,
            reqdExctnDt: window.previewData.reqdExctnDt || selectedTransactions[0]?.pmtInfData?.reqdExctnDt || null,
            initgPty: { Nm: window.previewData.transactions[0].dbtrNm },
            orgnlMsgNmId: window.previewData.orgnlMsgNmId,
            pmtInfs: [{
                pmtInfId: selectedTransactions[0].pmtInfData.pmtInfId,
                nbOfTxs: selectedTransactions[0].pmtInfData.nbOfTxs,
                ctrlSum: selectedTransactions[0].pmtInfData.ctrlSum,
                reqdExctnDt: selectedTransactions[0].pmtInfData.reqdExctnDt,
                dbtr: selectedTransactions[0].pmtInfData.dbtr,
                dbtrAcct: selectedTransactions[0].pmtInfData.dbtrAcct,
                dbtrAgt: selectedTransactions[0].pmtInfData.dbtrAgt,
                txInfs: selectedTransactions.map(tx => tx.originalData)
            }]
        };

        try {
            const convertResponse = await fetch('/convert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    pain001Data: filteredPain001Data,
                    options: {
                        cxlReason: 'CUST',
                        pmtInfCxl: false
                    }
                }),
            });

            const convertData = await convertResponse.json();

            if (convertData.success) {
                window.location.href = convertData.downloadUrl;
            } else {
                alert('Fehler bei der Konvertierung: ' + (convertData.error || 'Unbekannter Fehler'));
            }
        } catch (error) {
            alert('Fehler bei der Konvertierung: ' + error.message);
        }
    });

    convertButtonContainer.appendChild(convertButton);
    document.getElementById('resultContainer').appendChild(convertButtonContainer);
});

document.getElementById('tableSearch').addEventListener('keyup', function() {
    const filter = this.value.toLowerCase();
    const rows = document.querySelectorAll('#tableBody tr');
    rows.forEach(row => {
        const rowText = row.textContent.toLowerCase();
        if (rowText.includes(filter)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
})