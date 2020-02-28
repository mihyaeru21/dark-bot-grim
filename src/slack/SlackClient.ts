import { App as SlackApp } from '@slack/bolt';
import { MessageID, SlackUser, User } from './Domain';

export interface SlackClient {
  fetchUsers(): Promise<Map<string, User>>;

  postMessage(arg: {
    channel: string;
    text: string;
    userName: string;
    iconUrl?: string;
    iconEmoji?: string;
  }): Promise<MessageID>;

  deleteMessage(channel: string, ts: string): Promise<void>;

  postTimelineMessage(
    channel: string,
    text: string,
    originalChannel: string,
    userName: string,
    iconUrl: string,
  ): Promise<MessageID>;

  postImageUrl(
    channel: string,
    title: string,
    altText: string,
    imageUrl: string,
  ): Promise<MessageID>;
}

export class SlackClientImpl implements SlackClient {
  readonly app: SlackApp;
  readonly token: string;

  constructor(app: SlackApp, botToken: string) {
    this.app = app;
    this.token = botToken;
  }

  async fetchUsers(): Promise<Map<string, User>> {
    const users = await this.app.client.users.list({
      token: this.token,
    });
    if (!users.ok) {
      throw new Error(users.error);
    }
    const members: Array<SlackUser> = users.members as Array<SlackUser>;
    return new Map(
      members.map((m): [string, User] => {
        let profile = m.profile.image_512;
        if (profile === '') {
          profile = m.profile.image_192;
        }
        if (profile === '') {
          profile = m.profile.image_48;
        }
        return [
          m.id,
          {
            id: m.id,
            name: m.name,
            profile: profile,
            isBot: m.is_bot,
          },
        ];
      }),
    );
  }
  async postMessage(arg: {
    channel: string;
    text: string;
    userName: string;
    iconUrl?: string;
    iconEmoji?: string;
  }): Promise<MessageID> {
    /* eslint-disable @typescript-eslint/camelcase */
    let icon = {};
    if (arg.iconUrl !== undefined) {
      icon = {
        icon_url: arg.iconUrl,
      };
    }
    if (arg.iconEmoji !== undefined) {
      icon = {
        icon_emoji: arg.iconEmoji,
      };
    }
    const response = await this.app.client.chat.postMessage({
      token: this.token,
      channel: arg.channel,
      text: arg.text,
      username: arg.userName,
      link_names: false,
      ...icon,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message: any = response.message;
    return message.ts;
  }

  async deleteMessage(channel: string, ts: string): Promise<void> {
    await this.app.client.chat.delete({
      token: this.token,
      channel: channel,
      ts: ts,
    });
    return;
  }

  async postTimelineMessage(
    channel: string,
    text: string,
    originalChannel: string,
    userName: string,
    iconUrl: string,
  ): Promise<string> {
    const blocks = [
      {
        type: 'context',
        elements: [
          {
            type: 'image',
            image_url: iconUrl,
            alt_text: userName,
          },
          {
            type: 'mrkdwn',
            text: `${userName} at <#${originalChannel}>`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'plain_text',
          text: text,
          emoji: true,
        },
      },
    ];
    const response = await this.app.client.chat.postMessage({
      token: this.token,
      channel: channel,
      text: text,
      blocks: blocks,
      link_names: false,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message: any = response.message;
    return message.ts;
  }

  async postImageUrl(
    channel: string,
    title: string,
    altText: string,
    imageUrl: string,
  ): Promise<MessageID> {
    const blocks = [
      {
        type: 'image',
        title: {
          type: 'plain_text',
          text: title,
        },
        image_url: imageUrl,
        alt_text: altText,
      },
    ];
    const response = await this.app.client.chat.postMessage({
      token: this.token,
      channel: channel,
      text: title,
      blocks: blocks,
      link_names: false,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message: any = response.message;
    return message.ts;
  }
}
/* eslint-enable @typescript-eslint/camelcase */
