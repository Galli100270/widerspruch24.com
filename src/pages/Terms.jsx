import React from 'react';
import LegalLayout from '@/components/LegalLayout';
import { useLocalization } from '@/components/hooks/useLocalization';

export default function Terms() {
  const { t } = useLocalization();

  return (
    <LegalLayout title="Terms and Conditions">
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-4">1. Scope of Application</h2>
          <p className="mb-4">
            These General Terms and Conditions (Terms) apply to all contracts between 
            BEST-PREIS VERWALTUNG LIMITED ("Provider") and users of the Objection24 platform 
            ("Customers") regarding the creation of objection drafts and related services.
          </p>
          <p className="mb-4">
            Deviating, conflicting, or supplementary General Terms and Conditions of the Customer 
            shall not become part of the contract unless their validity is expressly agreed to in writing.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">2. Services and Scope of Use</h2>
          
          <h3 className="text-lg font-medium mb-2">2.1 Objection Generator</h3>
          <p className="mb-4">
            Objection24 provides an AI-powered software platform for creating objection drafts. 
            The platform analyzes uploaded documents and generates structured objection texts 
            based on the information entered.
          </p>

          <h3 className="text-lg font-medium mb-2">2.2 Beta Phase and Test Mode</h3>
          <p className="mb-4">
            The platform is partially in beta stage. During the beta phase, functions may be 
            limited or subject to change. Customers receive extended free access during the 
            beta phase for testing purposes.
          </p>

          <h3 className="text-lg font-medium mb-2">2.3 No Legal Advice</h3>
          <p className="mb-4">
            <strong>Important Notice:</strong> Documents created through Objection24 do not 
            constitute legal advice and do not replace consultation with a qualified lawyer. 
            Each case is individual and requires expert legal assessment.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">3. Prices and Payment Terms</h2>
          
          <h3 className="text-lg font-medium mb-2">3.1 Pricing Models</h3>
          <p className="mb-4">Objection24 offers the following pricing models:</p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li><strong>Single Case:</strong> €5.00 incl. VAT per objection</li>
            <li><strong>5-Pack:</strong> €22.50 incl. VAT (€4.50 per objection), valid for 12 months</li>
            <li><strong>Pro Subscription:</strong> €20.00 incl. VAT monthly, unlimited objections, monthly cancellation</li>
          </ul>

          <h3 className="text-lg font-medium mb-2">3.2 Payment Processing</h3>
          <p className="mb-4">
            Payment is processed through the payment service provider Stripe. Common credit and 
            debit cards are accepted. The amount is due immediately for single cases, monthly 
            in advance for subscriptions.
          </p>

          <h3 className="text-lg font-medium mb-2">3.3 Free Trial Period</h3>
          <p className="mb-4">
            New users receive a 30-day free trial period with full functionality. 
            After the trial period expires, paid use is required.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">4. Contract Formation and Right of Withdrawal</h2>
          
          <h3 className="text-lg font-medium mb-2">4.1 Contract Formation</h3>
          <p className="mb-4">
            The contract is concluded by confirmation of payment. For single cases, an individual 
            contract is created; for subscriptions, a continuing obligation relationship.
          </p>

          <h3 className="text-lg font-medium mb-2">4.2 Right of Withdrawal</h3>
          <p className="mb-4">
            Consumers have a statutory right of withdrawal of 14 days. For digital content that is 
            provided immediately (download), the right of withdrawal expires with the start of 
            performance after express consent and acknowledgment of the loss of withdrawal.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">5. Terms of Use and Obligations</h2>
          
          <h3 className="text-lg font-medium mb-2">5.1 Proper Use</h3>
          <p className="mb-4">
            The customer undertakes to use the platform only for lawful purposes and not to 
            provide misleading or incomplete information.
          </p>

          <h3 className="text-lg font-medium mb-2">5.2 Personal Responsibility</h3>
          <p className="mb-4">
            The customer is personally responsible for checking the generated objection texts 
            for completeness, correctness, and legal appropriateness before use.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">6. Liability</h2>
          
          <h3 className="text-lg font-medium mb-2">6.1 Limitation of Liability</h3>
          <p className="mb-4">
            The provider's liability is excluded to the extent legally permissible. This applies 
            in particular to the correctness, completeness, and legal effectiveness of the 
            generated objection texts.
          </p>

          <h3 className="text-lg font-medium mb-2">6.2 Technical Availability</h3>
          <p className="mb-4">
            The provider strives for high availability of the platform but does not guarantee 
            uninterrupted availability.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">7. Term and Termination</h2>
          
          <h3 className="text-lg font-medium mb-2">7.1 Single Cases and Packages</h3>
          <p className="mb-4">
            Single case contracts end with service provision. 5-packs are valid for 12 months.
          </p>

          <h3 className="text-lg font-medium mb-2">7.2 Subscriptions</h3>
          <p className="mb-4">
            Subscriptions have a minimum term of one month and automatically renew unless 
            cancelled by the end of the term. Cancellation can be made at any time through 
            the customer account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">8. Data Protection</h2>
          <p className="mb-4">
            The protection of personal data is important to us. Details on data processing 
            can be found in our privacy policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">9. Dispute Resolution</h2>
          <p className="mb-4">
            In case of disputes, the EU's online dispute resolution platform is available: 
            <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline ml-1">
              https://ec.europa.eu/consumers/odr/
            </a>
          </p>
          <p className="mb-4">
            We are not obliged to participate in dispute resolution proceedings before a 
            consumer arbitration board.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">10. Final Provisions</h2>
          
          <h3 className="text-lg font-medium mb-2">10.1 Changes to the Terms</h3>
          <p className="mb-4">
            The provider reserves the right to change these Terms with reasonable notice. 
            Changes will be communicated to customers by email. If the customer does not 
            object within 30 days, the changes are deemed approved.
          </p>

          <h3 className="text-lg font-medium mb-2">10.2 Applicable Law</h3>
          <p className="mb-4">
            The law of the Federal Republic of Germany applies, excluding the UN Convention 
            on Contracts for the International Sale of Goods.
          </p>

          <h3 className="text-lg font-medium mb-2">10.3 Severability Clause</h3>
          <p>
            Should individual provisions of these Terms be or become invalid, the validity 
            of the remaining provisions remains unaffected.
          </p>
        </section>
      </div>
    </LegalLayout>
  );
}