import { expect } from "chai";
import sinon from "sinon";
import Slack from "../src/lib/slack.js";
import ReportRequest from "../src/lib/reportRequest.js";
import fs from "fs";

describe("Slack", () => {
  beforeEach(async () => {
    sinon.spy(console, "error");
    sinon.spy(console, "log");
    sinon.stub(Slack, "postManualVerification").returns(Promise.resolve());
  });

  afterEach(async () => {
    sinon.restore();
  });

  it("createSlackMessagePayload", () => {
    const nostrEvent = {
      id: "12",
      pubkey: "34",
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
              reporterPubkey: "npub123",
            })
          ).toString("base64"),
        },
      },
    };

    const reportRequest = ReportRequest.fromCloudEvent(cloudEvent);
    const slackMessagePayload = Slack.createSlackMessagePayload(reportRequest);

    expect(slackMessagePayload).to.be.eql({
      channel: "bar",
      text: "npub123 reported event 12",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Pubkey npub123 reported an event:\n```\nundefined\n```",
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
                  style: "code",
                  text: '{\n  "id": "12",\n  "pubkey": "34",\n  "created_at": 1673347337,\n  "kind": 1,\n  "content": "Foobar",\n  "tags": [\n    [\n      "e",\n      "56"\n    ],\n    [\n      "p",\n      "78"\n    ]\n  ],\n  "sig": "91"\n}',
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
              type: "button",
              text: { type: "plain_text", text: "hate" },
              value: '["other","IH"]',
              action_id: "hate",
            },
            {
              type: "button",
              text: { type: "plain_text", text: "hate/threatening" },
              value: '["other","HC-bhd"]',
              action_id: "hate/threatening",
            },
            {
              type: "button",
              text: { type: "plain_text", text: "harassment" },
              value: '["other","IL-har"]',
              action_id: "harassment",
            },
            {
              type: "button",
              text: { type: "plain_text", text: "harassment/threatening" },
              value: '["other","HC-bhd"]',
              action_id: "harassment/threatening",
            },
            {
              type: "button",
              text: { type: "plain_text", text: "self-harm" },
              value: '["other","HC-bhd"]',
              action_id: "self-harm",
            },
            {
              type: "button",
              text: { type: "plain_text", text: "self-harm/intent" },
              value: '["other","HC-bhd"]',
              action_id: "self-harm/intent",
            },
            {
              type: "button",
              text: { type: "plain_text", text: "self-harm/instructions" },
              value: '["other","HC-bhd"]',
              action_id: "self-harm/instructions",
            },
            {
              type: "button",
              text: { type: "plain_text", text: "sexual" },
              value: '["nudity","NS"]',
              action_id: "sexual",
            },
            {
              type: "button",
              text: { type: "plain_text", text: "sexual/minors" },
              value: '["illegal","IL-csa"]',
              action_id: "sexual/minors",
            },
            {
              type: "button",
              text: { type: "plain_text", text: "violence" },
              value: '["other","VI"]',
              action_id: "violence",
            },
            {
              type: "button",
              text: { type: "plain_text", text: "violence/graphic" },
              value: '["other","VI"]',
              action_id: "violence/graphic",
            },
          ],
        },
      ],
    });
  });
});
