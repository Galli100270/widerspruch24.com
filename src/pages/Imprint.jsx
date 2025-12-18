import React from 'react';
import LegalLayout from '@/components/LegalLayout';
import { useLocalization } from '@/components/hooks/useLocalization';

export default function Imprint() {
  const { t } = useLocalization();

  return (
    <LegalLayout title="Imprint">
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-4">Information according to § 5 TMG</h2>
          
          <div className="space-y-3">
            <div>
              <strong>BEST-PREIS VERWALTUNG LIMITED</strong><br />
              Registration number: 15004930<br />
              Registered office: 71-75 Shelton Street, Covent Garden<br />
              London WC2H 9JQ, United Kingdom
            </div>
            
            <div>
              <strong>Managing Director:</strong><br />
              Wlassow Wladislaw Sergejewitsch
            </div>
            
            <div>
              <strong>Contact:</strong><br />
              Email: info@widerspruch24.de<br />
              Website: widerspruch24.de
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Responsible for content according to § 55 para. 2 RStV</h2>
          <p>
            Wlassow Wladislaw Sergejewitsch<br />
            71-75 Shelton Street, Covent Garden<br />
            London WC2H 9JQ, United Kingdom
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">EU Dispute Resolution</h2>
          <p>
            The European Commission provides a platform for online dispute resolution (ODR): 
            <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline ml-1">
              https://ec.europa.eu/consumers/odr/
            </a>
          </p>
          <p className="mt-2">
            You can find our email address in the imprint above.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Consumer Dispute Resolution</h2>
          <p>
            We are not willing or obliged to participate in dispute resolution proceedings before a consumer arbitration board.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Legal Advice Disclaimer</h2>
          <p>
            Objection24 is a technical tool for creating objection drafts. Using the platform does not constitute 
            legal advice and does not replace consultation with a qualified lawyer. Each case must be evaluated individually.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Liability Disclaimer</h2>
          
          <h3 className="text-lg font-medium mb-2">Liability for Content</h3>
          <p className="mb-4">
            As a service provider, we are responsible for our own content on these pages in accordance with § 7 para. 1 TMG 
            and general laws. However, according to §§ 8 to 10 TMG, we as a service provider are not obliged to monitor 
            transmitted or stored third-party information or to investigate circumstances that indicate illegal activity.
          </p>

          <h3 className="text-lg font-medium mb-2">Liability for Links</h3>
          <p className="mb-4">
            Our offer contains links to external websites of third parties, on whose contents we have no influence. 
            Therefore, we cannot assume any liability for these external contents. The respective provider or operator 
            of the pages is always responsible for the contents of the linked pages.
          </p>

          <h3 className="text-lg font-medium mb-2">Copyright</h3>
          <p>
            The content and works created by the site operators on these pages are subject to German copyright law. 
            Duplication, processing, distribution and any kind of exploitation outside the limits of copyright require 
            the written consent of the respective author or creator.
          </p>
        </section>
      </div>
    </LegalLayout>
  );
}