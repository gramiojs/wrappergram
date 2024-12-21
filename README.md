# wrappergram

<div align="center">

[![Bot API](https://img.shields.io/badge/Bot%20API-7.7+-blue?logo=telegram&style=flat&labelColor=000&color=3b82f6)](https://core.telegram.org/bots/api)
[![npm](https://img.shields.io/npm/v/wrappergram?logo=npm&style=flat&labelColor=000&color=3b82f6)](https://www.npmjs.org/package/wrappergram)
[![npm downloads](https://img.shields.io/npm/dw/wrappergram?logo=npm&style=flat&labelColor=000&color=3b82f6)](https://www.npmjs.org/package/wrappergram)
[![JSR](https://jsr.io/badges/@gramio/wrappergram)](https://jsr.io/@gramio/wrappergram)
[![JSR Score](https://jsr.io/badges/@gramio/wrappergram/score)](https://jsr.io/@gramio/wrappergram)
[![bundlejs](<https://deno.bundlejs.com/badge?q=wrappergram&treeshake=[*]&text=%22const+telegram+=+new+Telegram(process.env.BOT_TOKEN+as+string);\n\ntelegram.api.sendMessage({\n++++chat_id:+617580375,\n++++text:+%22Hello!%22,\n});%22>)](https://bundlejs.com/?q=wrappergram&treeshake=%5B*%5D&text=%22const+telegram+%3D+new+Telegram%28process.env.BOT_TOKEN+as+string%29%3B%5Cn%5Cntelegram.api.sendMessage%28%7B%5Cn++++chat_id%3A+617580375%2C%5Cn++++text%3A+%5C%22Hello%21%5C%22%2C%5Cn%7D%29%3B%22)

</div>

Simple and tiny code-generated **Telegram Bot API** wrapper for TypeScript/JavaScript with [file upload](https://core.telegram.org/bots/api#sending-files) support.

🌐 **Multi-runtime** - Works on [Node.js](https://nodejs.org/), [Bun](https://bun.sh/) and [Deno](https://deno.com/)

⚙️ **Code-generated** - For example, [code-generated and auto-published Telegram Bot API types](https://github.com/gramiojs/types))

🛡️ **Type-safe** - Written in TypeScript with love ❤️

🤏 **Tiny** - Simple `sendMessage` call cost some [![bundlejs](https://edge.bundlejs.com/?text=import%20%7B%20Telegram%20%7D%20from%20%22wrappergram%22%3B%0A%0Aconst%20telegram%20%3D%20new%20Telegram%28process.env.BOT_TOKEN%29%3B%0A%0Atelegram.api.sendMessage%28%7B%0A%20%20%20%20chat_id%3A%20617580375%2C%0A%20%20%20%20text%3A%20%22Hello%21%22%2C%0A%7D%29%3B&badge)](https://bundlejs.com/?q=wrappergram&treeshake=%5B*%5D&text=%22const+telegram+%3D+new+Telegram%28process.env.BOT_TOKEN+as+string%29%3B%5Cn%5Cntelegram.api.sendMessage%28%7B%5Cn++++chat_id%3A+617580375%2C%5Cn++++text%3A+%5C%22Hello%21%5C%22%2C%5Cn%7D%29%3B%22) in bundle size. So it is a good choice for browser/serverless environments

But if you need a more complete framework, then please look to [`GramIO`](https://gramio.dev/).

### Usage

```ts
import { Telegram, getUpdates } from "wrappergram";

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

This example on bundlejs cost [![bundlejs](https://deno.bundlejs.com/badge?q=wrappergram&treeshake=[*]&share=MYewdgzgLgBFCmAbeBzATgQwLYwLwzHgHcYAVJVTLACgAc0Rh4IIA6eMAN1YCEB5UgH1SfANIBRAHIBKANwAoeQmTpsrDLQCWrCBwAmAWWYQMKeNQDe8mDZjAAFhiiDNegFwwAbAEYA7AFYADgAGAGYAgBprWwQADygPACIACSREEABCRKiAXzlFADMQNBgMIgxNWGpQSFgAV1o9J3gYEAKYMygAVUbmiGplSmxpaRgrWztwCBBkVnSUagamhHzom012xd6EVixjU3gAflYChixR8YmYilUsdS0dfSMWA8s1q4mHJxd3GCXm3b7MwnM6sVxRD4fOIJGApTQZMiOMAAawgMCKJSg9haexeZmy7wmeQURPkOSAA)](https://bundlejs.com/?q=wrappergram&treeshake=%5B*%5D&share=MYewdgzgLgBFCmAbeBzATgQwLYwLwzHgHcYAVJVTLACgAc0Rh4IIA6eMAN1YCEB5UgH1SfANIBRAHIBKANwAoeQmTpsrDLQCWrCBwAmAWWYQMKeNQDe8mDZjAAFhiiDNegFwwAbAEYA7AFYADgAGAGYAgBprWwQADygPACIACSREEABCRKiAXzlFADMQNBgMIgxNWGpQSFgAV1o9J3gYEAKYMygAVUbmiGplSmxpaRgrWztwCBBkVnSUagamhHzom012xd6EVixjU3gAflYChixR8YmYilUsdS0dfSMWA8s1q4mHJxd3GCXm3b7MwnM6sVxRD4fOIJGApTQZMiOMAAawgMCKJSg9haexeZmy7wmeQURPkOSAA)

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
    reply_markup: new InlineKeyboard().url(
        "GitHub",
        "https://github.com/gramiojs/wrappergram"
    ),
});
```

This example cost - [![bundlejs](<https://deno.bundlejs.com/badge?q=wrappergram,@gramio/keyboards&treeshake=[*],[*]&text=%22const+telegram+=+new+Telegram(process.env.BOT_TOKEN);\n\ntelegram.api.sendMessage({\n++chat_id:+617580375,\n++text:+%22Hello!%22,\n++reply_markup:+new+InlineKeyboard().url(%22GitHub%22,+%22https://github.com/gramiojs/wrappergram%22)\n});%22>)](https://bundlejs.com/?q=wrappergram%2C%40gramio%2Fkeyboards&treeshake=%5B*%5D%2C%5B*%5D&text=%22const+telegram+%3D+new+Telegram%28process.env.BOT_TOKEN%29%3B%5Cn%5Cntelegram.api.sendMessage%28%7B%5Cn++chat_id%3A+617580375%2C%5Cn++text%3A+%5C%22Hello%21%5C%22%2C%5Cn++reply_markup%3A+new+InlineKeyboard%28%29.url%28%5C%22GitHub%5C%22%2C+%5C%22https%3A%2F%2Fgithub.com%2Fgramiojs%2Fwrappergram%5C%22%29%5Cn%7D%29%3B%22)

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

This example cost - [![bundlejs](<https://deno.bundlejs.com/badge?q=wrappergram&text=%22const+telegram+=+new+Telegram(process.env.BOT_TOKEN);+\n\ntelegram.api.sendPhoto({+\n++chat_id:+%22@gramio_forum%22,+\n++text:+%22Hello,+world!%22,+\n++photo:+MediaUpload.path(%22./cute-cat.png%22),+\n});%22>)](https://bundlejs.com/?q=wrappergram&treeshake=%5B*%5D&text=%22const+telegram+%3D+new+Telegram%28process.env.BOT_TOKEN%29%3B+%5Cn%5Cntelegram.api.sendPhoto%28%7B+%5Cn++chat_id%3A+%5C%22%40gramio_forum%5C%22%2C+%5Cn++text%3A+%5C%22Hello%2C+world%21%5C%22%2C+%5Cn++photo%3A+MediaUpload.path%28%5C%22.%2Fcute-cat.png%5C%22%29%2C+%5Cn%7D%29%3B%22)

[Read more here](https://gramio.dev/files/overview)
