# Cleanster - Nostr Content Moderation with OpenAI

Cleanster is a Google Cloud Function node application designed to filter and moderate content from Nostr using OpenAI's moderation service. With the surge in user-generated content, maintaining the quality and safety of shared data is paramount. Cleanster seamlessly takes in a pubsub feed of Nostr content, checks it, and generates Nostr events tagging the results.

## Table of Contents

1. [Requirements](#requirements)
2. [Installation](#installation)
3. [Usage](#usage)
4. [Support](#support)
5. [Contributing](#contributing)
6. [License](#license)

## Requirements

- Google Cloud Account
- Node.js v20+
- OpenAI API Key
- Nostr account

## Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/planetary-social/cleanster.git
   cd cleanster
   ```

2. **Prerequisites**

   - Install the Datastore emulator following these [instructions](https://cloud.google.com/datastore/docs/tools/datastore-emulator).
   - Install Dependencies with `pnpm install`

## Usage

1. **Tests**

   Ensure you have a `NOSTR_PRIVATE_KEY` env key set with a test account and then start the datastore emulator with `pnpm startDataStoreEmulator`.

   In another terminal run the tests with `pnpm test`

2. **Deploy to Google Cloud**

   Ensure you have the gcloud CLI set up and configured with your account credentials. Then `pnpm deploy`. This will upload the function code which expects the NOSTR_PRIVATE_KEY, which contains the secret key for the [report publishing account](npub14h23jzlyvumks4rvrz6ktk36dxfyru8qdf679k7q8uvxv0gm0vnsyqe2sh), and a comma separated OPENAI_API_CSV variable to access the OpenAI api. 3. **Monitor Output**

   Once deployed, Cleanster will tag the Nostr events with moderation results through [NIP-56](https://github.com/nostr-protocol/nips/blob/master/56.md) reports that are published to `wss://relay.nos.social`, helping you easily identify content that may need attention.

## Support

If you encounter any issues or have suggestions for improvements, please [open an issue](https://github.com/your-repo/cleanster/issues) or contact our support team at support@nos.social.

## Contributing

We welcome contributions! If you'd like to contribute:

1. Fork this repository.
2. Create a new branch: `git checkout -b feature-name`.
3. Implement your feature or bug fix.
4. Commit your changes.
5. Push to your branch: `git push origin feature-name`.
6. Create a new pull request from the branch.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

Thank you for using or considering Cleanster, a powerful tool in ensuring a safer Nostr content experience.
