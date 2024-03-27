export default class Slack {
  static async postManualVerification(reportRequest) {
    console.log(
      `TODO: Implement Slack.postManualVerification.\n
       Event payload: ${JSON.stringify(reportRequest.reportedEvent)}\n
       Reporter pubkey: ${reportRequest.reporterPubkey}\n
       Reporter text: ${reportRequest.reporterText}`
    );
  }
}
