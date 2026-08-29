```javascript
// -----------------------------------------------------
// SALVA ACCOUNT MINING
// -----------------------------------------------------

async function saveMiningAccount(updateTimestamp = true) {

    if (!currentUser) {
        return;
    }

    const updateData = {

        balance_points:
            Number(balance),

        miner_level:
            Number(minerLevel),

        speed_bonus:
            Number(speedBonus),

        offline_hours:
            Number(offlineHours),

        mining_active:
            Boolean(miningActive)
    };


    if (updateTimestamp) {

        updateData.last_mining_at =
            new Date().toISOString();
    }


    const { error } =
        await supabaseClient
            .from("mining_accounts")
            .update(updateData)
            .eq(
                "user_id",
                currentUser.id
            );


    if (error) {

        console.error(
            "❌ Errore salvataggio:",
            error
        );

        return false;
    }


    if (updateTimestamp) {

        lastMiningAt =
            new Date();
    }


    console.log(
        "✅ Mining salvato:",
        Number(balance).toFixed(4)
    );

    return true;
}


// -----------------------------------------------------
// CALCOLO PRODUZIONE
// -----------------------------------------------------

function getProductionPerMinute() {

    const bonus =
        1 + (speedBonus / 100);

    return (
        BASE_PRODUCTION_PER_MINUTE *
        minerLevel *
        bonus
    );
}


// -----------------------------------------------------
// AGGIUNGI PRODUZIONE
// -----------------------------------------------------

function addMiningProduction(minutes) {

    if (!miningActive) {
        return 0;
    }

    if (!Number.isFinite(minutes)) {
        return 0;
    }

    if (minutes <= 0) {
        return 0;
    }

    const earned =
        getProductionPerMinute() *
        minutes;

    balance += earned;

    window.balance =
        balance;

    return earned;
}


// -----------------------------------------------------
// PRODUZIONE OFFLINE
// -----------------------------------------------------

async function calculateOfflineMining() {

    if (!miningActive) {
        return 0;
    }

    if (!lastMiningAt) {
        return 0;
    }


    const now =
        new Date();


    let elapsedMinutes =
        (
            now.getTime() -
            lastMiningAt.getTime()
        ) / 60000;


    if (elapsedMinutes <= 0) {
        return 0;
    }


    const maxOfflineMinutes =
        offlineHours * 60;


    const creditedMinutes =
        Math.min(
            elapsedMinutes,
            maxOfflineMinutes
        );


    const earned =
        addMiningProduction(
            creditedMinutes
        );


    console.log(
        "⛏️ OFFLINE MINING",
        {
            elapsedMinutes:
                elapsedMinutes.toFixed(2),

            creditedMinutes:
                creditedMinutes.toFixed(2),

            earned:
                earned.toFixed(4)
        }
    );


    // Il tempo è stato contabilizzato.
    lastMiningAt =
        now;


    // Salva balance e timestamp
    // senza modificare nuovamente
    // lastMiningAt.

    await saveMiningAccount(false);


    updateMiningUI();


    return earned;
}


// -----------------------------------------------------
// SALVATAGGIO AUTOMATICO
// -----------------------------------------------------

let lastAutoSave =
    Date.now();


// Salva ogni 30 secondi,
// NON ogni secondo.

setInterval(
    async () => {

        if (!currentUser) {
            return;
        }


        if (!miningActive) {
            return;
        }


        // Aggiorna il saldo
        // per la sessione attuale.

        addMiningProduction(
            30 / 60
        );


        updateMiningUI();


        const now =
            Date.now();


        // Salvataggio ogni 30 secondi.

        if (
            now -
            lastAutoSave >=
            30000
        ) {

            lastAutoSave =
                now;

            await saveMiningAccount(false);
        }

    },
    1000
);
```
