<div align="center">

# 🤖 LLMonitor

**Monitoring for your <span style="background-color: rgb(219, 234, 254);">AI apps</span>**

[website](https://llmonitor.com) - [demo](https://app.llmonitor.com/demo) - [![npm version](https://badge.fury.io/js/llmonitor.svg)](https://badge.fury.io/js/llmonitor)

---  

</div>

Features:
* Simple to self host (deploy to Vercel & Supabase)
* Use with any model, not just OpenAI
* Log agent runs and identify errors with full history
* Records completion requests, search and explore request history in the dashboard
* Latency and token analytics

Currently, a [JS client](https://github.com/llmonitor/llmonitor-js) is available with Python in the works.
* Doesn't add latency with an extra endpoint
* Langchain support

## Todo 

[ ] Update setup-dump.sql to latest
[ ] Users support
[ ] Embedding models analytics
[ ] Tools views 
[ ] Agents alert
[x] Sidebar layout 
[x] Agent view
[x] Generations view

## Self-hosting

1. Setup a new [Supabase](https://supabase.com) project (recommended to [self-host it yourself](https://supabase.com/docs/guides/self-hosting/)]

2. Connect to the database and run the `setup-dump.sql` file content

2. `cp .env.example .env` and fill in the values

3. Deploy this repo to folder to Vercel or any other hosting service

4. Done