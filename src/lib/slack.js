import { WebClient } from "@slack/web-api";
import OPENAI_CATEGORIES from "./openAICategories.js";

if (!process.env.SLACK_TOKEN) {
  throw new Error("SLACK_TOKEN environment variable is required");
}

if (!process.env.CHANNEL_ID) {
  throw new Error("CHANNEL_ID environment variable is required");
}

const token = process.env.SLACK_TOKEN;
const channelId = process.env.CHANNEL_ID;
const web = new WebClient(token);
export default class Slack {
  // Check https://app.slack.com/block-kit-builder
  static async postManualVerification(reportRequest) {
    try {
      const messagePayload = this.createSlackMessagePayload(reportRequest);
      await web.chat.postMessage(messagePayload);

      console.log(
        `Sent event ${reportRequest.reportedEvent.id} to Slack for manual evaluation.`
      );
    } catch (error) {
      console.error(error);
    }
  }

  static createSlackMessagePayload(reportRequest) {
    const text = `New Nostr Event to moderate requested by pubkey \`${reportRequest.reporterPubkey}\``;

    const elements = Object.entries(OPENAI_CATEGORIES).map(
      ([category, categoryData]) => {
        return {
          type: "button",
          text: {
            type: "plain_text",
            text: category,
          },
          value: JSON.stringify({
            reporterPubkey: reportRequest.reporterPubkey,
            nip56_report_type: categoryData.nip56_report_type,
            nip69: categoryData.nip69,
          }),
          action_id: category,
        };
      }
    );

    elements.unshift({
      type: "button",
      text: {
        type: "plain_text",
        text: "Skip",
      },
      value: "skip",
      action_id: "skip",
    });

    return {
      channel: channelId,
      text,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text,
          },
        },
        {
          type: "rich_text",
          block_id: "reporterText",
          elements: [
            {
              type: "rich_text_preformatted",
              elements: [
                {
                  type: "text",
                  text:
                    reportRequest.reporterText ||
                    "No text provided by reporter",
                },
              ],
              border: 0,
            },
          ],
        },
        {
          type: "rich_text",
          block_id: "reportedEvent",
          elements: [
            {
              type: "rich_text_preformatted",
              elements: [
                {
                  type: "text",
                  style: { code: true },
                  text: JSON.stringify(reportRequest.reportedEvent, null, 2),
                },
              ],
              border: 0,
            },
          ],
        },
        {
          type: "actions",
          elements,
        },
      ],
    };
  }
}
