import { } from "react";
import LinkedInIntegrationCard    from "../../components/integrations/LinkedInIntegrationCard.jsx";
import JustdialIntegrationCard    from "../../components/integrations/JustdialIntegrationCard.jsx";
import IndiaMartIntegrationCard   from "../../components/integrations/IndiaMartIntegrationCard.jsx";
import NinetyNineAcresIntegrationCard from "../../components/integrations/NinetyNineAcresIntegrationCard.jsx";
import SulekhaIntegrationCard     from "../../components/integrations/SulekhaIntegrationCard.jsx";
import WhatsAppIntegrationCard    from "../../components/integrations/WhatsAppIntegrationCard.jsx";
import InstagramIntegrationCard   from "../../components/integrations/InstagramIntegrationCard.jsx";
import FacebookIntegrationCard    from "../../components/integrations/FacebookIntegrationCard.jsx";

const usePlanFeature = (key) => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user?.planFeatures?.[key] !== false;
  } catch {
    return true;
  }
};

export default function Integrations() {
  const hasFacebook  = usePlanFeature("integration_facebook");
  const hasLinkedin  = usePlanFeature("integration_linkedin");
  const hasJustdial  = usePlanFeature("integration_justdial");
  const hasIndiamart = usePlanFeature("integration_indiamart");
  const has99acres   = usePlanFeature("integration_99acres");
  const hasSulekha   = usePlanFeature("integration_sulekha");
  const hasWhatsApp  = usePlanFeature("integration_whatsapp");
  const hasInstagram = usePlanFeature("integration_instagram");

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Integrations</h1>
        <p className="text-gray-500 text-sm mt-1">
          Connect your social channels and lead sources to centralise everything in the CRM
        </p>
      </div>

      {hasFacebook  && <FacebookIntegrationCard />}
      {hasInstagram && <InstagramIntegrationCard />}
      {hasWhatsApp  && <WhatsAppIntegrationCard />}
      {hasLinkedin  && <LinkedInIntegrationCard />}
      {hasJustdial  && <JustdialIntegrationCard />}
      {hasIndiamart && <IndiaMartIntegrationCard />}
      {has99acres   && <NinetyNineAcresIntegrationCard />}
      {hasSulekha   && <SulekhaIntegrationCard />}
    </div>
  );
}
