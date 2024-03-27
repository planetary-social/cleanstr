export default class ReportRequest {
  constructor(reportedEvent, reporterPubkey, reporterText) {
    this.reportedEvent = reportedEvent;
    this.reporterPubkey = reporterPubkey;
    this.reporterText = reporterText;
  }

  static fromCloudEvent(cloudEvent) {
    const data = cloudEvent.data.message.data;
    const jsonString = data ? Buffer.from(data, "base64").toString() : "{}";
    const json = JSON.parse(jsonString);

    if (json?.reportedEvent) {
      return new ReportRequest(
        json.reportedEvent,
        json?.reporterPubkey,
        json?.reporterText
      );
    }

    return new ReportRequest(json, null, null);
  }

  canBeManualVerified() {
    return Boolean(this.reporterPubkey);
  }
}