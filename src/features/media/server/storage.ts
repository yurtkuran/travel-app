import "server-only";

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { getServerEnv } from "@/lib/env";

export interface MediaStorage {
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  get(key: string): Promise<Buffer>;
  getUrl(key: string): string;
  put(key: string, contents: Buffer): Promise<void>;
}

function safeKey(key: string) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9/_-]*\.[a-z0-9]+$/.test(key)) {
    throw new Error("Invalid media storage key");
  }
  return key;
}

export class FileSystemMediaStorage implements MediaStorage {
  readonly root: string;

  constructor(root = getServerEnv().MEDIA_ROOT) {
    this.root = path.resolve(root);
  }

  private resolve(key: string) {
    return path.join(this.root, safeKey(key));
  }

  async put(key: string, contents: Buffer) {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents, { flag: "wx" });
  }

  async get(key: string) {
    return readFile(this.resolve(key));
  }

  getUrl(key: string) {
    return `/media/${safeKey(key).split("/").map(encodeURIComponent).join("/")}`;
  }

  async delete(key: string) {
    await rm(this.resolve(key), { force: true });
  }

  async exists(key: string) {
    try {
      await readFile(this.resolve(key));
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw error;
    }
  }
}

let storage: MediaStorage | undefined;
export function getMediaStorage() {
  return (storage ??= new FileSystemMediaStorage());
}
