// examples/node-usage.js
// Calls the Drug Safety & Recall Monitor Actor and prints its dataset items.
// Requires: npm install apify-client
// Requires: APIFY_TOKEN set in the environment (from `apify auth token` or the Apify Console).

const { ApifyClient } = require('apify-client');

const client = new ApifyClient({
    token: process.env.APIFY_TOKEN,
});

async function main() {
    const run = await client.actor('HJZvKxFUpZop6gIQ3').call({
        sources: ['fda', 'ema'],
        maxItemsPerSource: 50,
        onlyNew: true,
        dateRange: '7d',
        fdaClassification: ['Class I', 'Class II'],
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    for (const item of items) {
        console.log(
            `[${item.jurisdiction}] ${item.event_type} - ${item.recipient_or_defendant_name} (${item.status_or_estado})`,
        );
    }

    console.log(`\nTotal records: ${items.length}`);
}

main().catch((err) => {
    console.error('Actor run failed:', err);
    process.exit(1);
});
