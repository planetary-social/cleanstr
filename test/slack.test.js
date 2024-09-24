import { expect } from "chai";
import sinon from "sinon";
import Slack from "../src/lib/slack.js";
import ReportRequest from "../src/lib/reportRequest.js";
import fs from "fs";
import Nostr from "../src/lib/nostr.js";

describe("Slack", () => {
  beforeEach(async () => {
    sinon.spy(console, "error");
    sinon.spy(console, "log");
    sinon.stub(Slack, "postManualVerification").returns(Promise.resolve());
    sinon.stub(Nostr, "fetchProfile").returns(Promise.resolve());
  });

  afterEach(async () => {
    sinon.restore();
  });

  it("createSlackMessagePayload", async () => {
    const pubkey =
      "56d4b3d6310fadb7294b7f041aab469c5ffc8991b1b1b331981b96a246f6ae65";
    const nostrEvent = {
      id: "12",
      pubkey,
      created_at: 1673347337,
      kind: 1,
      content: "Foobar",
      tags: [
        ["e", "56"],
        ["p", "78"],
      ],
      sig: "91",
    };

    const cloudEvent = {
      data: {
        message: {
          data: Buffer.from(
            JSON.stringify({
              reportedEvent: nostrEvent,
              reporterPubkey: pubkey,
            })
          ).toString("base64"),
        },
      },
    };

    const reportRequest = ReportRequest.fromCloudEvent(cloudEvent);
    await Nostr.maybeFetchNip05(reportRequest);
    const slackMessagePayload = Slack.createSlackMessagePayload(reportRequest);

    expect(slackMessagePayload).to.be.eql({
      channel: "something",
      text: "New Nostr Event to moderate requested by https://njump.me/npub12m2t8433p7kmw22t0uzp426xn30lezv3kxcmxvvcrwt2y3hk4ejsvre68j reporting an event published by https://njump.me/npub12m2t8433p7kmw22t0uzp426xn30lezv3kxcmxvvcrwt2y3hk4ejsvre68j",
      unfurl_links: false,
      unfurl_media: false,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "New Nostr Event to moderate requested by https://njump.me/npub12m2t8433p7kmw22t0uzp426xn30lezv3kxcmxvvcrwt2y3hk4ejsvre68j reporting an event published by https://njump.me/npub12m2t8433p7kmw22t0uzp426xn30lezv3kxcmxvvcrwt2y3hk4ejsvre68j",
          },
        },
        {
          block_id: "reporterText",
          type: "rich_text",
          elements: [
            {
              type: "rich_text_preformatted",
              elements: [
                {
                  style: {
                    italic: true,
                  },
                  text: "No text provided by reporter",
                  type: "text",
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
          block_id: "reportedText",
          type: "rich_text",
          elements: [
            {
              border: 0,
              elements: [
                {
                  style: {
                    italic: true,
                  },
                  text: "Foobar",
                  type: "text",
                },
              ],
              type: "rich_text_preformatted",
            },
          ],
        },
        {
          block_id: "reportedEvent",
          type: "rich_text",
          elements: [
            {
              type: "rich_text_preformatted",
              elements: [
                {
                  type: "text",
                  style: { code: true },
                  text: '{\n  "id": "12",\n  "pubkey": "56d4b3d6310fadb7294b7f041aab469c5ffc8991b1b1b331981b96a246f6ae65",\n  "created_at": 1673347337,\n  "kind": 1,\n  "content": "Foobar",\n  "tags": [\n    [\n      "e",\n      "56"\n    ],\n    [\n      "p",\n      "78"\n    ]\n  ],\n  "sig": "91"\n}',
                },
              ],
              border: 0,
            },
          ],
        },
        {
          type: "actions",
          elements: [
            {
              action_id: "skip",
              style: "danger",
              text: {
                text: "Skip",
                type: "plain_text",
              },
              type: "button",
              value:
                "56d4b3d6310fadb7294b7f041aab469c5ffc8991b1b1b331981b96a246f6ae65",
            },
            {
              action_id: "nudity",
              text: {
                text: "nudity",
                type: "plain_text",
              },
              type: "button",
              value:
                "56d4b3d6310fadb7294b7f041aab469c5ffc8991b1b1b331981b96a246f6ae65",
            },
            {
              action_id: "malware",
              text: {
                text: "malware",
                type: "plain_text",
              },
              type: "button",
              value:
                "56d4b3d6310fadb7294b7f041aab469c5ffc8991b1b1b331981b96a246f6ae65",
            },
            {
              action_id: "profanity",
              text: {
                text: "profanity",
                type: "plain_text",
              },
              type: "button",
              value:
                "56d4b3d6310fadb7294b7f041aab469c5ffc8991b1b1b331981b96a246f6ae65",
            },
            {
              action_id: "illegal",
              text: {
                text: "illegal",
                type: "plain_text",
              },
              type: "button",
              value:
                "56d4b3d6310fadb7294b7f041aab469c5ffc8991b1b1b331981b96a246f6ae65",
            },
            {
              action_id: "spam",
              text: {
                text: "spam",
                type: "plain_text",
              },
              type: "button",
              value:
                "56d4b3d6310fadb7294b7f041aab469c5ffc8991b1b1b331981b96a246f6ae65",
            },
            {
              action_id: "impersonation",
              text: {
                text: "impersonation",
                type: "plain_text",
              },
              type: "button",
              value:
                "56d4b3d6310fadb7294b7f041aab469c5ffc8991b1b1b331981b96a246f6ae65",
            },
            {
              action_id: "other",
              text: {
                text: "other",
                type: "plain_text",
              },
              type: "button",
              value:
                "56d4b3d6310fadb7294b7f041aab469c5ffc8991b1b1b331981b96a246f6ae65",
            },
          ],
        },
      ],
    });
  });
});
