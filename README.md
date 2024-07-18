# wrappergram

<div align="center">

[![Bot API](https://img.shields.io/badge/Bot%20API-7.7+-blue?logo=telegram&style=flat&labelColor=000&color=3b82f6)](https://core.telegram.org/bots/api)
[![npm](https://img.shields.io/npm/v/gramio?logo=npm&style=flat&labelColor=000&color=3b82f6)](https://www.npmjs.org/package/wrappergram)
[![JSR](https://jsr.io/badges/@gramio/wrappergram)](https://jsr.io/@gramio/wrappergram)
[![JSR Score](https://jsr.io/badges/@gramio/wrappergram/score)](https://jsr.io/@gramio/wrappergram)

</div>

Simple and tiny code-generated **Telegram Bot API** wrapper for TypeScript/JavaScript with [file upload](https://core.telegram.org/bots/api#sending-files) support.

🌐 **Multi-runtime** - Works on [Node.js](https://nodejs.org/), [Bun](https://bun.sh/) and [Deno](https://deno.com/)

⚙️ **Code-generated** - For example, [code-generated and auto-published Telegram Bot API types](https://github.com/gramiojs/types))

🛡️ **Type-safe** - Written in TypeScript with love ❤️

But if you need a more complete framework, then please look to [`GramIO`](https://gramio.dev/).

### Usage

```ts
import { Telegram } from "wrappergram";

const telegram = new Telegram(process.env.BOT_TOKEN as string);

telegram.api.sendMessage({
    chat_id: 617580375,
    text: "Hello!",
});

for await (const update of getUpdates(telegram)) {
    console.log(update);

    if (update.message?.from) {
        telegram.api.sendMessage({
            chat_id: update.message.from.id,
            text: "Hi! Thanks for the message",
        });
    }
}
```

> [!IMPORTANT]
> Use `getUpdates` only **once** in your code otherwise it will cause double calls to [getUpdates](https://core.telegram.org/bots/api#getupdates)

### Call api

You can send requests to Telegram Bot API Methods via `telegram.api` with full type-safety!

```ts
const response = await telegram.api.sendMessage({
    chat_id: "@gramio_forum",
    text: "Hello, world!",
});

if (!response.ok) console.error("Something went wrong");
else console.log(`New message id is ${response.result.message_id}`);
```

### Send keyboards

For keyboards you need to install [`@gramio/keyboard`](https://www.npmjs.com/package/@gramio/keyboards) library and just use it!

```ts
import { Keyboard } from "@gramio/keyboards";

// telegram init
telegram.api.sendMessage({
    chat_id: "@gramio_forum",
    text: "Hello, world!",
    reply_markup: new InlineKeyboard().url("GitHub", "https://github.com/gramiojs/wrappergram");
});
```

[Read more here](https://gramio.dev/keyboards/overview)

### Send files

[`@gramio/files`](https://gramio.dev/files/overview) already used under the hood so you don't need to install it

```ts
import { MediaUpload } from "wrappergram";

telegram.api.sendPhoto({
    chat_id: "@gramio_forum",
    text: "Hello, world!",
    photo: MediaUpload.path("./cute-cat.png"),
});

telegram.api.sendDocument({
    chat_id: "@gramio_forum",
    text: "Hello, world!",
    photo: Bun.file("README.md"), // you can use File instance to upload files
});
```

[Read more her](https://gramio.dev/files/overview)
