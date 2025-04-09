import { Context, Schema } from 'koishi';
export declare const name = "hypixel-ban-tracker";
export interface Config {
    apiUrl?: string;
    cacheDuration?: number;
}
export declare const Config: Schema<Config>;
export declare function apply(ctx: Context, config: Config): void;
