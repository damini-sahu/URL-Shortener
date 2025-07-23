import { reset, seed } from "drizzle-seed";
import * as schemas from "./schema.js";
import { db } from "../config/db.js";
// Seeding in a database refers to the process of populating a database with initial data. This is often used during development or testing.
// Drizzle provides a package named drizzle-seed which makes it easier to seed the database. You have to install it using npm i drizzle-seed.
// You can also write your own randomizer or seed code if you don't want to use this package.
// Drizzle Seed generates deterministic data based on the schema you provide. It uses a random seed to generate data, so the same seed will always produce the same data. This is useful for testing and development purposes.

//! await reset(db, schemas); // This will reset whole schemas

const USER_ID = 1;
await reset(db, { shortLinksTable: schemas.shortLinksTable });
await seed(
  db,
  { shortLinksTable: schemas.shortLinksTable },
  { count: 100 }
).refine((f) => ({
  shortLinksTable: {
    columns: {
      userId: f.default({ defaultValue: USER_ID }),
      url: f.default({ defaultValue: "https://www.youtube.com/" }),
    },
  },
}));
process.exit(0);
