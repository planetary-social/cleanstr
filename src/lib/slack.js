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
      const result = await web.chat.postMessage();

      console.log(
        `Sent event ${reportRequest.reportedEvent.id} to Slack for manual evaluation.`
      );
    } catch (error) {
      console.error(error);
    }
  }

  static createSlackMessagePayload(reportRequest) {
    const longText = `Pubkey ${reportRequest.reporterPubkey} reported an event:\n\`\`\`\n${reportRequest.reporterText}\n\`\`\``;

    const shortText = `${reportRequest.reporterPubkey} reported event ${reportRequest.reportedEvent.id}`;

    const elements = Object.entries(OPENAI_CATEGORIES).map(
      ([category, categoryData]) => {
        return {
          type: "button",
          text: {
            type: "plain_text",
            text: category,
          },
          value: JSON.stringify([
            categoryData.nip56_report_type,
            categoryData.nip69,
          ]),
          action_id: category,
        };
      }
    );

    return {
      channel: channelId,
      text: shortText,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: longText,
          },
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
