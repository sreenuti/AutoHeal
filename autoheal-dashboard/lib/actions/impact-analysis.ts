/**
 * Projected Impact (workflow-level) — dependency graph awareness for banking ops.
 * Tells the user exactly which downstream processes will be affected by the proposed fix.
 */

export type ImpactAssessment = {
  downstreamSystems: string[];
  estimatedDowntimeMinutes: number;
  riskLevel: "Low" | "Medium" | "High";
  affectedSLA: boolean;
};

export async function analyzeImpact(
  workflowName: string,
  actionType: string
): Promise<ImpactAssessment> {
  // Simulate a dependency graph lookup
  const impactMap: Record<string, ImpactAssessment> = {
    wf_Retail_Daily: {
      downstreamSystems: ["Mobile Banking App", "ATM Ledger Sync"],
      estimatedDowntimeMinutes: 12,
      riskLevel: "Medium",
      affectedSLA: false,
    },
    wf_General_Ledger: {
      downstreamSystems: ["Federal Reserve Reporting", "Quarterly Audit Tool"],
      estimatedDowntimeMinutes: 45,
      riskLevel: "High",
      affectedSLA: true,
    },
    wf_Compliance_Audit: {
      downstreamSystems: ["Regulatory Filing Pipeline", "Internal Compliance Dashboard"],
      estimatedDowntimeMinutes: 20,
      riskLevel: "Medium",
      affectedSLA: true,
    },
  };

  // Return the specific impact or a generic low-risk default
  return (
    impactMap[workflowName] ?? {
      downstreamSystems: ["Internal BI Dashboard"],
      estimatedDowntimeMinutes: 5,
      riskLevel: "Low",
      affectedSLA: false,
    }
  );
}
