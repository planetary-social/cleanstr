import { WebClient } from "@slack/web-api";
import Nostr from "./nostr.js";

if (!process.env.SLACK_TOKEN) {
  throw new Error("SLACK_TOKEN environment variable is required");
}

if (!process.env.CHANNEL_ID) {
  throw new Error("CHANNEL_ID environment variable is required");
}

const token = process.env.SLACK_TOKEN;
const channelId = process.env.CHANNEL_ID;
const web = new WebClient(token);

// https://github.com/nostr-protocol/nips/blob/master/56.md
const nip56_report_type = [
  "nudity",
  "malware",
  "profanity",
  "illegal",
  "spam",
  "impersonation",
  "other",
];

const code = (string) => `\`${string}\``;
export default class Slack {
  // Check https://app.slack.com/block-kit-builder
  static async postManualVerification(reportRequest) {
    try {
      await Nostr.maybeFetchNip05(reportRequest);

      const messagePayload = this.createSlackMessagePayload(reportRequest);
      await web.chat.postMessage(messagePayload);

      console.log(
        `Sent event ${reportRequest.nevent()} to Slack for manual evaluation.`
      );
    } catch (error) {
      console.error(error);
    }
  }

  static createSlackMessagePayload(reportRequest) {
    let text = `New Nostr Event to moderate requested by ${reportRequest.njump} reporting an event published by ${reportRequest.reportedUserNjump}`;

    const elements = nip56_report_type.map((category) => {
      return {
        type: "button",
        text: {
          type: "plain_text",
          text: category,
        },
        value: reportRequest.reporterPubkey,
        action_id: category,
      };
    });

    elements.unshift({
      type: "button",
      style: "danger",
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
