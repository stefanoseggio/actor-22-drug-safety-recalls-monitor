# examples/python_usage.py
# Calls the Drug Safety & Recall Monitor Actor and prints its dataset items.
# Requires: pip install apify-client
# Requires: APIFY_TOKEN set in the environment (from `apify auth token` or the Apify Console).

import os

from apify_client import ApifyClient

client = ApifyClient(os.environ["APIFY_TOKEN"])

run = client.actor("HJZvKxFUpZop6gIQ3").call(
    run_input={
        "sources": ["fda", "ema"],
        "maxItemsPerSource": 50,
        "onlyNew": True,
        "dateRange": "7d",
        "fdaClassification": ["Class I", "Class II"],
    }
)

dataset_items = client.dataset(run["defaultDatasetId"]).list_items().items

for item in dataset_items:
    print(
        f"[{item['jurisdiction']}] {item['event_type']} - "
        f"{item['recipient_or_defendant_name']} ({item['status_or_estado']})"
    )

print(f"\nTotal records: {len(dataset_items)}")
