import { Client } from "cassandra-driver";
import fs from "fs";
import path from "path";

export const client = new Client({
  contactPoints: ["node-0.aws-us-east-1.0aaec21c5d626fd2a59f.clusters.scylla.cloud", "node-1.aws-us-east-1.0aaec21c5d626fd2a59f.clusters.scylla.cloud", "node-2.aws-us-east-1.0aaec21c5d626fd2a59f.clusters.scylla.cloud"],
  localDataCenter: 'AWS_US_EAST_1',
  credentials: {username: 'scylla', password: 'N0VvaBiz4qS2Oex'},
  keyspace: "youtube",
});

client
  .connect()
  .then(async() => {
    console.log("Connected to ScyllaDB");
  })
  .catch((err) => console.error("ScyllaDB connection error:", err));
