import { config } from "dotenv";
import { readFileSync } from "fs";

type Constructor<T> = new () => T;

export class ConfigurationManager {
    configContainer: Record<string, unknown> = {};

    constructor() {
        config();
    }

    loadJson(file: string) {
        const content = readFileSync(file, "utf-8");
        this.configContainer = JSON.parse(content);
    }

    bind<T extends object>(ctor: Constructor<T>): T {
        const instance = new ctor();
        const sectionName = ctor.name.toLowerCase();

        const sectionKey = Object.keys(this.configContainer).find(
            (key) => key.toLowerCase() === sectionName
        );

        if (!sectionKey) {
            throw new Error(`Configuration section "${ctor.name}" not found`);
        }

        const section = this.configContainer[sectionKey];
        if (typeof section !== "object" || section === null) {
            throw new Error(`Configuration section "${ctor.name}" is not an object`);
        }

        for (const [key, value] of Object.entries(section as Record<string, unknown>)) {
            const matchingProp = Object.keys(instance).find(
                (prop) => prop.toLowerCase() === key.toLowerCase()
            );
            if (matchingProp) {
                (instance as Record<string, unknown>)[matchingProp] = value;
            }
        }

        return instance;
    }
}