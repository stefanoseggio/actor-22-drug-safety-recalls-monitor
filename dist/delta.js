function classify(newEventType, previous, current) {
    if (!previous)
        return newEventType;
    if (previous.statusFingerprint !== current.statusFingerprint)
        return 'STATUS_CHANGE';
    if (previous.contentFingerprint !== current.contentFingerprint)
        return 'UPDATED';
    return 'SNAPSHOT_NO_DIFF';
}
export function classifyFdaRecord(previous, current) {
    return classify('SANCTION', previous, current);
}
export function classifyEmaRecord(previous, current) {
    return classify('NEW_LISTING', previous, current);
}
//# sourceMappingURL=delta.js.map