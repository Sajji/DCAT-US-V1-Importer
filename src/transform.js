/**
 * transform.js
 * Pure function: takes a parsed DCAT-US catalog object and a community name,
 * returns the Collibra import JSON array (community + domain + assets).
 *
 * No I/O here — keeps this module easily testable in isolation.
 */

/**
 * @param {object} catalog   Parsed DCAT-US data.json
 * @param {string} community Collibra community name (from dataLocations.json)
 * @returns {object[]}       Array ready for Collibra's /rest/2.0/import/json-job
 */
export function transform(catalog, community) {
  const domainName = `${community} — Data Usage Registry`;

  const domainRef = {
    name:      domainName,
    community: { name: community },
  };

  // ── Community + Domain ───────────────────────────────────────────────────

  const structure = [
    {
      resourceType: "Community",
      identifier:   { name: community },
    },
    {
      resourceType: "Domain",
      identifier:   { name: domainName, community: { name: community } },
      type:         { name: "Data Usage Registry" },
    },
  ];

  // ── Assets ───────────────────────────────────────────────────────────────

  const datasets = Array.isArray(catalog.dataset) ? catalog.dataset : [];

  const assets = datasets.map((d) => {
    const downloadURL =
      Array.isArray(d.distribution) && d.distribution.length > 0
        ? (d.distribution[0].downloadURL ?? "")
        : "";

    const keywords   = Array.isArray(d.keyword) ? d.keyword.join(", ") : "";
    const programCode = Array.isArray(d.programCode) ? d.programCode[0] : (d.programCode ?? "");
    const bureauCode  = Array.isArray(d.bureauCode)  ? d.bureauCode[0]  : (d.bureauCode  ?? "");
    const contactEmail = d.contactPoint?.hasEmail?.replace(/^mailto:/i, "") ?? "";

    return {
      resourceType: "Asset",
      identifier: {
        name:   `${d.title}---${d.identifier}`,
        domain: domainRef,
      },
      type: { name: "DCAT Data Set" },
      attributes: {
        // Store clean values — no embedded "Field: ..." prefixes.
        "Description":               [{ value: d.description          ?? "" }],
        "DCAT:title":                [{ value: d.title                ?? "" }],
        "DCAT:landingPage":          [{ value: d.landingPage          ?? "" }],
        "DCAT:description":          [{ value: d.description          ?? "" }],
        "DCAT:accessLevel":          [{ value: d.accessLevel          ?? "" }],
        "DCAT:distributionURL":      [{ value: downloadURL                  }],
        "DCAT:modified":             [{ value: d.modified             ?? "" }],
        "DCAT:spatial":              [{ value: d.spatial              ?? "" }],
        "DCAT:license":              [{ value: d.license              ?? "" }],
        "DCAT:keyword":              [{ value: keywords                     }],
        "DCAT:publisher":            [{ value: d.publisher?.name      ?? "" }],
        "DCAT:programCode":          [{ value: programCode                  }],
        "DCAT:bureauCode":           [{ value: bureauCode                   }],
        "DCAT:contactPointFullName": [{ value: d.contactPoint?.fn     ?? "" }],
        "DCAT:contactPointEmail":    [{ value: contactEmail                 }],
      },
    };
  });

  return [...structure, ...assets];
}
