# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Python tool-routing agent for n8n

A FastAPI agent is available in `AgentAI/`.

### Setup

1. Install Python dependencies:

```bash
python -m pip install -r requirements.txt
```

2. Create your `.env` from `.env.example` and set `OPENAI_API_KEY`.

3. Run the agent locally:

```bash
uvicorn AgentAI.main:app --host 127.0.0.1 --port 8000 --reload
```

### n8n usage

Send a POST request to `http://127.0.0.1:8000/api/agent` with:

```json
{
  "prompt": "calcule 5 * 5",
  "workflow_name": "my-workflow"
}
```

The agent returns the final answer plus the tool execution trace, so n8n can decide what to do next.

The router can invoke the generic `call_n8n_webhook` tool when the prompt implies calling an external workflow endpoint.
