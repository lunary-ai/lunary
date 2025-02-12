<div align="center">

<p align="center">
  <img src="https://lunary.ai/banner.jpeg" alt="Abso banner" width=1040 />
</p>

# lunary

**Toolkit for LLM chatbots**

[website](https://lunary.ai) - [docs](https://lunary.ai/docs) - [llm sdk](https://github.com/lunary-ai/abso)

[![npm version](https://badge.fury.io/js/lunary.svg)](https://badge.fury.io/js/lunary) ![PyPI - Version](https://img.shields.io/pypi/v/lunary) ![GitHub last commit (by committer)](https://img.shields.io/github/last-commit/lunary-ai/lunary) ![GitHub commit activity (branch)](https://img.shields.io/github/commit-activity/w/lunary-ai/lunary)

</div>

## Features

Lunary helps developers of LLM Chatbots develop and improve them.

- 🖲️ Conversation & feedback tracking
- 💵 Analytics (costs, token, latency, ..)
- 🔍 Debugging (logs, traces, user tracking, ..)
- ⛩️ Prompt Directory (versioning, team collaboration, ..)
- 🏷️ Datasets (for evaluation, fine-tuning, ..)
- 🧪 Topic & sentiment analysis

It also designed to be:

- 📝 Easy to use
- 📦 Fast to integrate (2 minutes)
- 🧑‍💻 Self-hostable

## 1-min Demo

https://github.com/user-attachments/assets/4f95d952-a89b-442b-854a-e71e036073bb

## ⚙️ Integration

Modules available for:

- [JavaScript](https://github.com/lunary-ai/lunary-js)
- [Python](https://github.com/lunary-ai/lunary-py)

Lunary natively supports:

- [Abso](https://github.com/lunary-ai/abso)
- [LangChain](https://lunary.ai/docs/langchain) (JS & Python)
- [OpenAI module](https://lunary.ai/docs/js/openai)
- [LiteLLM](https://docs.litellm.ai/docs/observability/lunary_integration)
- [Flowise](https://lunary.ai/docs/integrations/flowise)

Additionally you can use it with any other LLM by manually sending events.

## 📚 Documentation

Full documentation is available [on the website](https://lunary.ai/docs/intro).

## ☁️ Hosted version

We offer [a hosted version](https://lunary.ai) with a generous free tier.

With the hosted version:

- 👷 don't worry about devops or managing updates
- 🙋 get priority 1:1 support with our team
- 🇪🇺 your data is stored safely in Europe

## Running locally

1. Clone the repository
2. Setup a PostgreSQL instance (version 15 minimum)
3. Copy the content of `packages/backend/.env.example` to `packages/backend/.env` and fill the missing values
4. Copy the content of `packages/frontend/.env.example` to `packages/frontend/.env` and fill the missing values
5. Run `npm install`
6. Run `npm run migrate:db`
7. Run `npm run dev`

You can now open the dashboard at `http://localhost:8080`.
When using our JS or Python SDK, you need to set the environment variable `LUNARY_API_URL` to `http://localhost:3333`. You can use `LUNARY_VERBOSE=True` to see all the event sent by the SDK

## 🙋 Support

Need help or have questions? Chat with us on [the website](https://lunary.ai) or email us: [hello [at] lunary.ai](mailto:hello@lunary.ai). We're here to help every step of the way.

## License

This project is licensed under the Apache 2.0 License.
