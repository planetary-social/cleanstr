# Cleanster - Nostr Content Moderation with OpenAI

Cleanster is a Cloudflare node application designed to filter and moderate content from Nostr using OpenAI's moderation service. With the surge in user-generated content, maintaining the quality and safety of shared data is paramount. Cleanster seamlessly takes in a pubsub feed of Nostr content, checks it, and generates Nostr events tagging the results.

## Table of Contents

1. [Requirements](#requirements)
2. [Installation](#installation)
3. [Usage](#usage)
4. [Support](#support)
5. [Contributing](#contributing)
6. [License](#license)

## Requirements

- Cloudflare account
- Node.js v14+
- OpenAI API Key

## Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/your-repo/cleanster.git
   cd cleanster
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Setup Configuration**

   Rename `config.sample.json` to `config.json` and populate it with your OpenAI API key and any other necessary configurations.

## Usage

1. **Run Locally**

   Start the application locally using:

   ```bash
   npm run start
   ```

   This will start the node server and begin processing the Nostr pubsub feed through OpenAI's moderation service.

2. **Deploy to Cloudflare**

   Ensure you have the Cloudflare CLI set up and configured with your account credentials. Then:

   ```bash
   npm run deploy
   ```

3. **Monitor Output**

   Once deployed, Cleanster will tag the Nostr events with moderation results, helping you easily identify content that may need attention.

## Support

If you encounter any issues or have suggestions for improvements, please [open an issue](https://github.com/your-repo/cleanster/issues) or contact our support team at support@email.com.

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

Remember to replace placeholders like `https://github.com/your-repo/cleanster.git` and `support@email.com` with your actual repository link and support email address respectively.
