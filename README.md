<div align="center">

# 📈 lunary

**Open-source observability & prompt platform for LLMs**

[website](https://lunary.ai) - [docs](https://lunary.ai/docs) - [self host](https://lunary.ai/docs/self-host)

[![npm version](https://badge.fury.io/js/lunary.svg)](https://badge.fury.io/js/lunary) ![PyPI - Version](https://img.shields.io/pypi/v/llmonitor) ![GitHub last commit (by committer)](https://img.shields.io/github/last-commit/lunary-ai/lunary) ![GitHub commit activity (branch)](https://img.shields.io/github/commit-activity/w/lunary-ai/lunary)

</div>

## Features

Lunary helps AI devs take their apps in production, with features such as:

- 💵 Analytics (cost, token, latency, ..)
- 🔍 Monitoring (logs, traces, user tracking, ..)
- ⛩️ Prompt Templates (versioning, team collaboration, ..)
- 🏷️ Creat fine-tuning datasets
- 🖲️ Chat & feedback tracking
- 🧪 Evaluations

It also designed to be:

- 🤖 Usable with any model, not just OpenAI
- 📦 Easy to integrate (2 minutes)
- 🧑‍💻 Simple to self-host

## Demo

https://github.com/lunary-ai/lunary/assets/5092466/a2b4ba9b-4afb-46e3-9b6b-faf7ddb4a931

## ⚙️ Integration

Modules available for:

- [JavaScript](https://github.com/lunary-ai/lunary-js)
- [Python](https://github.com/lunary-ai/lunary-py)

Lunary natively supports:

- [LangChain](https://lunary.ai/docs/langchain) (JS & Python)
- [OpenAI module](https://lunary.ai/docs/js/openai)
- [LiteLLM](https://docs.litellm.ai/docs/observability/lunary_integration)

Additionally you can use it with any framework by wrapping the relevant methods.

## 📚 Documentation

Full documentation is available [on the website](https://lunary.ai/docs/intro).

## ☁️ Hosted version

We offer [a hosted version](https://lunary.ai) with a free plan of up to 1k requests / days.

With the hosted version:

- 👷 don't worry about devops or managing updates
- 🙋 get priority 1:1 support with our team
- 🇪🇺 your data is stored safely in Europe

## Running locally

1. Clone the repository
2. Setup a PostgreSQL instance (version 15 minimum)
3. Copy the content of `packages/backend/.env.example` to `packages/backend/.env` and fill the missing values
4. Copy the content of `packages/frontend/.env.example` to `packages/backend/.env`
5. Run `npm install`
6. Run `npm run migrate:db`
7. Run `npm run dev`

You can now open the dashboard at `http://localhost:8080`.
When using our JS or Python SDK, you need to set the environment variable `LUNARY_API_URL` to `http://localhost:3333`. You can use `LUNARY_VERBOSE=True` to see all the event sent by the SDK

## 🙋 Support

Need help or have questions? Chat with us on [the website](https://lunary.ai) or email us: [hello [at] lunary.ai](mailto:hello@lunary.ai). We're here to support you every step of the way.

## License

This project is licensed under the Apache 2.0 License.
