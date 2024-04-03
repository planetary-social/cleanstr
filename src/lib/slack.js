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
    let text = `New Nostr Event to moderate requested by pubkey \`${reportRequest.reporterPubkey}\``;
    if (reportRequest.njump) {
      text = `New Nostr Event to moderate requested by ${reportRequest.njump}`;
    }

    if (reportRequest.reportedUserNjump) {
      text += ` reporting an event published by ${reportRequest.reportedUserNjump}`;
    }

    const elements = Object.entries(OPENAI_CATEGORIES).map(
      ([category, categoryData]) => {
        return {
          type: "button",
          text: {
            type: "plain_text",
            text: category,
          },
          value: reportRequest.reporterPubkey,
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
      value: reportRequest.reporterPubkey,
      action_id: "skip",
    });

    return {
      channel: channelId,
      text,
      unfurl_media: false,
      unfurl_links: false,
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
                  style: { italic: true },
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
          type: "section",
          text: {
            type: "plain_text",
            text: "Offending text:",
          },
        },
        {
          type: "rich_text",
          block_id: "reportedText",
          elements: [
            {
              type: "rich_text_preformatted",
              elements: [
                {
                  type: "text",
                  style: { italic: true },
                  text: reportRequest.reportedEvent.content,
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
