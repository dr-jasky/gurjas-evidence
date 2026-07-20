/* Gurjas tool-export module.
   Turns a tool result into a downloadable, hash-stamped Markdown + JSON
   audit record. Runs entirely in the browser; nothing is sent anywhere.
   Loaded only by tool pages that opt in — keep this out of script.js so
   pages that do not export anything do not pay for it. */
(function (global) {
  "use strict";

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function isoTimestamp(date) {
    return date.getUTCFullYear() + "-" + pad(date.getUTCMonth() + 1) + "-" + pad(date.getUTCDate())
      + "T" + pad(date.getUTCHours()) + ":" + pad(date.getUTCMinutes()) + ":" + pad(date.getUTCSeconds()) + "Z";
  }

  function dateStamp(date) {
    return date.getUTCFullYear() + "-" + pad(date.getUTCMonth() + 1) + "-" + pad(date.getUTCDate());
  }

  /* Recursively sorts object keys so the hashed JSON string is stable
     regardless of the order the caller built the record in. */
  function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value && typeof value === "object") {
      var out = {};
      Object.keys(value).sort().forEach(function (key) { out[key] = canonicalize(value[key]); });
      return out;
    }
    return value;
  }

  function bytesToHex(buffer) {
    var bytes = new Uint8Array(buffer), hex = "";
    for (var i = 0; i < bytes.length; i += 1) {
      var h = bytes[i].toString(16);
      hex += h.length === 1 ? "0" + h : h;
    }
    return hex;
  }

  function sha256Hex(text) {
    if (!(global.crypto && global.crypto.subtle && global.crypto.subtle.digest)) {
      return Promise.resolve(null);
    }
    var data = new TextEncoder().encode(text);
    return global.crypto.subtle.digest("SHA-256", data).then(bytesToHex).catch(function () { return null; });
  }

  function escapeMd(text) {
    return String(text == null ? "" : text);
  }

  /* Renders an arbitrary JSON-serialisable value as a short Markdown
     fragment: strings as text, arrays as bullet lists, objects as
     "key: value" lines. Depth is capped to keep the record legible. */
  function renderValue(value, depth) {
    depth = depth || 0;
    if (value == null || value === "") return "_none recorded_";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return escapeMd(value);
    }
    if (Array.isArray(value)) {
      if (!value.length) return "_none recorded_";
      return value.map(function (item) {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          return "- " + Object.keys(item).map(function (key) {
            return key + ": " + escapeMd(item[key]);
          }).join(", ");
        }
        return "- " + escapeMd(item);
      }).join("\n");
    }
    if (typeof value === "object") {
      var keys = Object.keys(value);
      if (!keys.length) return "_none recorded_";
      return keys.map(function (key) {
        return "- **" + key + ":** " + escapeMd(typeof value[key] === "object" ? JSON.stringify(value[key]) : value[key]);
      }).join("\n");
    }
    return escapeMd(String(value));
  }

  function buildMarkdown(record, hash) {
    var lines = [
      "# " + record.toolName + " — audit record",
      "",
      "- Tool: " + record.toolUrl,
      "- Method version: " + record.methodVersion,
      "- Generated: " + record.generatedAt,
      "- Integrity hash (SHA-256 of the canonical JSON record): " + (hash || "unavailable in this browser context"),
      "",
      "## Inputs",
      "",
      renderValue(record.inputs),
      "",
      "## Results",
      "",
      renderValue(record.results),
      "",
      "## Limitations",
      "",
      renderValue(record.limitations),
      "",
      "## Decision boundary",
      "",
      escapeMd(record.decisionBoundary || "Not stated."),
      "",
      "---",
      "",
      "This record was generated entirely in your browser at " + record.toolUrl + ". Gurjas did not receive these inputs or results and does not store this record. Re-running the tool may produce a different record if your inputs, the tool's method version or its underlying sources change.",
      "",
    ];
    return lines.join("\n");
  }

  function triggerDownload(filename, content, mimeType) {
    var blob = new Blob([content], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* Builds the exportable record without triggering a download. Returns a
     Promise resolving to { json, markdown, hash, filenameBase, record }. */
  function build(input) {
    if (!input || !input.toolId || !input.toolName || !input.methodVersion) {
      throw new Error("GurjasExport.build requires toolId, toolName and methodVersion.");
    }
    var now = new Date();
    var record = {
      toolId: input.toolId,
      toolName: input.toolName,
      toolUrl: input.toolUrl || (global.location ? global.location.href : ""),
      methodVersion: input.methodVersion,
      generatedAt: isoTimestamp(now),
      inputs: input.inputs || {},
      results: input.results || {},
      limitations: input.limitations || [],
      decisionBoundary: input.decisionBoundary || "",
    };
    var canonicalJson = JSON.stringify(canonicalize(record));
    var displayJson = JSON.stringify(record, null, 2) + "\n";
    var filenameBase = input.toolId + "-" + dateStamp(now);
    return sha256Hex(canonicalJson).then(function (hash) {
      return {
        record: record,
        hash: hash,
        json: displayJson,
        markdown: buildMarkdown(record, hash),
        filenameBase: filenameBase,
      };
    });
  }

  /* Builds the record and downloads it as both a Markdown and a JSON file.
     Returns a Promise resolving to the same shape as build(). */
  function download(input) {
    return build(input).then(function (built) {
      triggerDownload(built.filenameBase + ".md", built.markdown, "text/markdown");
      triggerDownload(built.filenameBase + ".json", built.json, "application/json");
      return built;
    });
  }

  global.GurjasExport = { build: build, download: download };
})(window);
