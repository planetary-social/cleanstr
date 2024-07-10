[![Node.js CI](https://github.com/planetary-social/cleanstr/actions/workflows/node.js.yml/badge.svg)](https://github.com/planetary-social/cleanstr/actions/workflows/node.js.yml)
[![codecov](https://codecov.io/gh/planetary-social/cleanstr/graph/badge.svg?token=QN61WNS6D5)](https://codecov.io/gh/planetary-social/cleanstr)

# Cleanstr - Nostr Content Moderation with OpenAI

Cleanstr is a Google Cloud Function node application designed to filter and moderate content from Nostr using OpenAI's moderation service. With the surge in user-generated content, maintaining the quality and safety of shared data is paramount. Cleanstr seamlessly takes in a pubsub feed of Nostr content, checks it, and generates Nostr events tagging the results.

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
   git clone https://github.com/planetary-social/cleanstr.git
   cd cleanstr
   ```

2. **Prerequisites**

   - Install Dependencies with `pnpm install`

## Usage

1. **Testing Setup**

   - Set a `NOSTR_PRIVATE_KEY` environment variable with the private key of a test nostr account used to publish moderation reports.
   - Run the tests with `pnpm test` to ensure everything is set up correctly.

2. **Deployment to Google Cloud**

    - **Prepare Your Environment**: Ensure the Google Cloud CLI (`gcloud`) is installed and configured with your account.
    - **Set Environment Variables**: `NOSTR_PRIVATE_KEY` for the reporting account private key, and `OPENAI_API_CSV` for your OpenAI API keys.
    - **Deploy the Function**: Use `pnpm run deploy` to upload Cleanstr to Google Cloud.
    - **Post-Deployment**: Cleanstr starts processing Nostr events and publishes moderation reports via NIP-56 on `wss://relay.nos.social`. You can change this relay to your own.

3. **Integration with our Nostr Relay**

   - If you don't want to host your own deployment you can use our relay. Add `wss://relay.nos.social` to your Nostr client's relay list.
   - Content flagged by Cleanstr is managed by this relay and marked as kind 1984 for prompt handling.
   - Following the [Reportinator](https://njump.me/nprofile1qqs2m4gep0jxwdmg23kp3dt9mgaxnyjp7rsx5a0zm0qr7xrx85dhkfcpzemhxue69uhhyetvv9ujumn0wvh8xmmrd9skcl8vqu6) bot in your Nostr client is essential for proper integration with Cleanstr's moderation reports.
   - Your client should properly process kind 1984 in a similar way that https://nos.social does. 

## Support

For any issues or suggestions, please [open an issue](https://github.com/your-repo/cleanstr/issues) or contact our support team at support@nos.social.

## Contributing

We welcome contributions! To contribute, fork the repository, create a feature branch, implement your changes, commit, push to your branch, and open a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
