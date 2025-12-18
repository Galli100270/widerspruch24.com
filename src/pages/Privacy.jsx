import React from 'react';
import LegalLayout from '@/components/LegalLayout';
import { useLocalization } from '@/components/hooks/useLocalization';

export default function Privacy() {
  const { t } = useLocalization();

  return (
    <LegalLayout title="Privacy Policy">
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-4">1. Privacy at a Glance</h2>
          
          <h3 className="text-lg font-medium mb-2">General Information</h3>
          <p className="mb-4">
            The following information provides a simple overview of what happens to your personal data when you 
            visit this website. Personal data is any data that can be used to personally identify you.
          </p>

          <h3 className="text-lg font-medium mb-2">Data Collection on this Website</h3>
          <p className="mb-2"><strong>Who is responsible for data collection on this website?</strong></p>
          <p className="mb-4">
            Data processing on this website is carried out by the website operator. You can find the operator's 
            contact details in the "Information about the responsible party" section of this privacy policy.
          </p>

          <p className="mb-2"><strong>How do we collect your data?</strong></p>
          <p className="mb-4">
            Your data is collected when you provide it to us. This could be data that you enter into a contact 
            form or when using our objection software.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">2. Responsible Party</h2>
          <p className="mb-4">
            The responsible party for data processing on this website is:
          </p>
          <div className="mb-4">
            <strong>BEST-PREIS VERWALTUNG LIMITED</strong><br />
            Wlassow Wladislaw Sergejewitsch<br />
            71-75 Shelton Street, Covent Garden<br />
            London WC2H 9JQ, United Kingdom<br />
            Email: info@widerspruch24.de
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">3. Legal Basis for Processing</h2>
          <p className="mb-4">
            We process your personal data on the following legal bases:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li><strong>Art. 6 para. 1 lit. b GDPR</strong> – Contract performance and pre-contractual measures</li>
            <li><strong>Art. 6 para. 1 lit. f GDPR</strong> – Legitimate interests (IT security, website operation)</li>
            <li><strong>Art. 6 para. 1 lit. a GDPR</strong> – Consent (e.g. cookies, newsletter)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">4. Data Processing When Using the Website</h2>
          
          <h3 className="text-lg font-medium mb-2">Server Log Files</h3>
          <p className="mb-4">
            The page provider automatically collects and stores information in server log files, which your browser 
            automatically transmits to us. These include: IP address, browser type and version, operating system used, 
            referrer URL, hostname of the accessing computer, and time of server request.
          </p>

          <h3 className="text-lg font-medium mb-2">Cookies</h3>
          <p className="mb-4">
            This website uses only technically necessary cookies for basic functionality and secure payment processing. 
            Consent is not required for this. You can set your browser to inform you about the setting of cookies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">5. Data Processing When Using the Objection Software</h2>
          
          <h3 className="text-lg font-medium mb-2">Collection of Case Data</h3>
          <p className="mb-4">
            When creating objections, we process the following data:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>Information about the sender (authority, company)</li>
            <li>Reference number and document date</li>
            <li>Your name and address (for the objection letter)</li>
            <li>Objection reasons and justification</li>
            <li>Uploaded documents (temporarily for OCR processing)</li>
          </ul>

          <h3 className="text-lg font-medium mb-2">AI Text Generation</h3>
          <p className="mb-4">
            We use AI services to create your objection texts. Processing is carried out in compliance with GDPR 
            and exclusively for the purpose of text creation.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">6. Payment Service Providers</h2>
          
          <h3 className="text-lg font-medium mb-2">Stripe</h3>
          <p className="mb-4">
            We use Stripe Payments Europe, Ltd. for payment processing. During payments, your payment data is 
            transmitted directly and encrypted to Stripe. We do not receive any card data.
          </p>
          <p className="mb-4">
            More information can be found in Stripe's privacy policy: 
            <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline ml-1">
              https://stripe.com/privacy
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">7. Your Rights</h2>
          <p className="mb-4">
            You have the following rights regarding your personal data:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>Right to information (Art. 15 GDPR)</li>
            <li>Right to rectification (Art. 16 GDPR)</li>
            <li>Right to erasure (Art. 17 GDPR)</li>
            <li>Right to restriction of processing (Art. 18 GDPR)</li>
            <li>Right to data portability (Art. 20 GDPR)</li>
            <li>Right to withdraw consent (Art. 7 para. 3 GDPR)</li>
            <li>Right to lodge a complaint with a supervisory authority (Art. 77 GDPR)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">8. Storage Duration</h2>
          <p className="mb-4">
            Your personal data will be deleted as soon as the purpose of processing ceases to apply. 
            Statutory retention periods remain unaffected. After deleting your account, all personal 
            data will be removed immediately.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">9. Data Security</h2>
          <p className="mb-4">
            We use appropriate technical and organizational security measures to protect your data against 
            accidental or intentional manipulation, loss, destruction, or access by unauthorized persons. 
            Our security measures are continuously improved in accordance with technological developments.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">10. Changes to this Privacy Policy</h2>
          <p>
            We reserve the right to adapt this privacy policy so that it always complies with current legal 
            requirements or to implement changes to our services in the privacy policy.
          </p>
        </section>
      </div>
    </LegalLayout>
  );
}