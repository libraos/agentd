# LibraOS End User Agreement

Version 3.3 of November 7, 2026.

## 1. Acceptance, Parties, and Authority

1.1. **Parties.** This End User Agreement (the "**Agreement**") is a contract between you and Nebula Nova Inc., a Delaware corporation ("**Nebula Nova**", "**we**", or "**us**"), for the LibraOS Software and Services.

1.2. **Acceptance.** Before your first use, your first Gateway request on each route (Section 5.3), and any material change (Section 13.4), we will show you the terms conspicuously and ask you to accept by an unchecked box or "I agree" button. For AgentD, we ask when you activate it (Section 4.6); AgentD records your acceptance (agreement version, time and user) on your machine and sends the same record with the registration described in Section 6.4 when reporting is on. We record each acceptance with a timestamp, user, organization, method, and the versions of this Agreement and Gateway Provider Terms accepted.

1.3. **Authority.** If you accept for an organization, you represent that you may bind it, and "you" means it. A "**Consumer**" is an individual acting mainly outside their trade, business, or profession.

1.4. **Related Documents and Precedence.** This Agreement incorporates the Website Terms (https://libraos.com/terms), the terms and prices on the Credits & billing page at https://console.libraos.com/credits (the "**Billing Terms**"), and the Section 5.3 obligations. Our Privacy Policy (https://libraos.com/privacy) governs personal data. On conflict, in order: (a) an open source license, for its component; (b) for personal data, the Privacy Policy, subject to mandatory law, but the commitment more protective of the individual applies; (c) the Section 5.3 obligations, for that route; (d) this Agreement; (e) the Billing Terms, for pricing and payment; (f) the Website Terms.

1.5. **Age.** You must be at least 18 and the age of majority where you live.

## 2. Definitions

"**AI Provider**" means Anthropic, OpenAI, or another model provider we name under Section 5.3.

"**Authorized User**" means an individual an organization permits to use the Software on its behalf.

"**Credentials**" means passwords, `nk_` and `lk_` keys, GitHub tokens, AI Provider keys and sign-ins, and other secrets used with the Software.

"**Input**" means material submitted to the Software or to an AI Provider through it. "**Output**" means content an AI Provider generates in response. "**User Content**" means Inputs, Outputs, and other content you store in the Services.

"**Services**" means the hosted LibraOS Cloud control plane at app.libraos.com and console.libraos.com, including workspaces, subdomains, keys, Chat, Builder, credits, Token Plans, and the model API gateway.

"**Software**" means the Services, AgentD, self-hosted LibraOS, Libra Desk, and LibraOS SDKs, installers, and documentation.

"**Worker**" means a Claude Code or Codex session that AgentD starts and coordinates on your machine.

## 3. License Grant and Restrictions

3.1. **License.** Subject to this Agreement, we grant you a limited, non-exclusive, non-transferable, non-sublicensable license to use the Software's proprietary components and access the Services for your internal business or personal purposes. An organization may let its Authorized Users use it on its behalf; that is not a transfer or sublicense, and the organization is responsible for their compliance. We may suspend or end the license only under Section 12. AgentD Core (the AgentD tool running on your machines, without Cloud Workers or Gateway Access) is provided free of charge. Your license to each AgentD Core version you have obtained is perpetual and irrevocable except under Section 12.3(a), and stays in force through any assignment, change of control, change of these terms, or end of AgentD. We, or a successor, may offer later versions under different terms, and you choose whether to accept them; Section 13.4 applies to any change.

3.2. **Open Source.** Open source components are governed by their own licenses, listed in their notice files, which this Agreement does not restrict.

3.3. **Restrictions.** Except as an open source license or law permits, you will not: (a) copy or modify proprietary components, except as needed to use them; (b) sell, rent, sublicense, or transfer the Software, except under Section 3.1; (c) reverse engineer or decompile proprietary components; (d) use our confidential information, or copy our proprietary code, to build a competing product; (e) remove proprietary notices; (f) bypass security, metering, or access controls; or (g) share, pool, or resell `lk_` key access outside your account. Lawful benchmarking, interoperability work, and independent development are not restricted.

## 4. Accounts and Credentials

4.1. **Registration.** You need a verified email address and accurate, current account information.

4.2. **Responsibility.** You are responsible for activity under your account or Credentials that you or your Authorized Users authorize or that your failure to protect them reasonably allows, but not for unauthorized activity our security failure causes. Report suspected misuse to the security contact in Section 14.

4.3. **Keys.** For `nk_` workspace keys, we store only the key id, never the secret; a lost `nk_` key is re-minted, not recovered. For `lk_` model API keys, [`lk_` key handling]. Revoke and replace any exposed key.

4.4. **Connected Accounts.** You may connect AI Provider sign-ins, API keys, and GitHub accounts you are entitled to use. With AgentD, they stay in locally configured tools such as Claude Code, Codex, git, or the GitHub CLI and AgentD never sends them to us; the only thing it sends about itself is described in Sections 4.6 and 6.4. If you store a Credential in the Services, [stored-credential handling]. Grant tokens minimal scopes.

4.5. **Personal Benefits.** Invite codes, private beta access, activation codes, and credits are personal and may not be sold, transferred, or shared outside your account.

4.6. **Activation.** During the private beta, AgentD asks once for an activation code from your Developer Console account. The code is signed by us and verified on your machine; it has no scheduled expiry, is not checked with us again, and needs no network connection to keep working (AgentD may re-verify the saved code locally for integrity). You may use the one code on every machine that you, or your organization's Authorized Users, use for your account; Section 4.5 still applies, so do not pass it outside your account. The code grants no access to your account, keys, credits or Cloud Workers, and we do not disable installed copies of AgentD Core remotely. Ending this Agreement under Section 12 ends your Console access; Section 12.4 says what happens to the AgentD Core versions you have.

## 5. Third-Party AI Providers

5.1. **Access Modes.** AgentD supplies no model access; Workers call their models as Claude Code or Codex is configured. LibraOS Cloud supplies model access only as Gateway Access. You use either:
(a) **Direct Access**: your own Claude or ChatGPT plan, or Anthropic or OpenAI API key, configured separately in the client. Requests go to the AI Provider, not through us, and it bills you; or
(b) **Gateway Access**: an `lk_` model API key from the Developer Console. Requests go through our gateway to the AI Provider and are paid from your credits or Token Plan under the Billing Terms.

5.2. **Direct Access Terms.** Your own agreement with the AI Provider, including its usage policies (https://www.anthropic.com/legal, https://openai.com/policies), governs Direct Access and its handling of your data. We are not a party to it.

5.3. **Gateway Provider Terms.** Each Gateway route's "**Gateway Provider Terms**" are: (a) Anthropic (Claude): the Commercial Terms of Service (https://www.anthropic.com/legal/commercial-terms) and Usage Policy (https://www.anthropic.com/legal/aup); (b) OpenAI (GPT and Codex): the Services Agreement (https://openai.com/policies/services-agreement), Service Terms (https://openai.com/policies/service-terms), and Usage Policies (https://openai.com/policies/usage-policies). Only these obligations are incorporated, in the version you accepted under Section 1.2, and you owe them to us, not the provider, unless it contracts with you separately: (i) comply with the route's usage policies; and (ii) follow the restrictions its terms place on end users, including any bar on using Outputs to develop competing models. You must accept changed Gateway Provider Terms before your next request on that route, or, if a change materially harms you, may stop Gateway Access with a refund under Section 12.4. New providers are named with their terms before you can select them. We may block requests we reasonably believe violate these obligations.

5.4. **Client Software.** Claude Code (Anthropic) and Codex (OpenAI) are licensed to you by their vendors; AgentD neither includes nor licenses them.

5.5. **Provider Decisions.** AI Providers may change or withdraw models, prices, or policies, or suspend your provider account. We are not responsible for those decisions where they are outside our reasonable control, but are responsible to the extent our routing, billing, failure to give notice we owe, or breach caused your loss.

## 6. Inputs, Outputs, and User Content

6.1. **Ownership.** As between us, you own your User Content, and we assign to you any rights we have in Outputs. Similar Outputs may be generated for others.

6.2. **License to Us.** For content you store in the Services or send through Gateway Access, you grant us a non-exclusive, royalty-free license to host, process, and transmit it only to provide, secure, and support the Services for you, ending for each item at its deletion under Section 6.6, except for backups within the backup period and data under a legal hold or open dispute. (a) **Hosting subprocessors**, listed at [subprocessor list URL], process it only for us under written terms requiring confidentiality, security, and deletion as Section 6.6 provides. (b) **Gateway AI Providers** are not our subprocessors; their Gateway Provider Terms, which we do not control, govern their processing and retention of Gateway content. You represent that you have the rights and consents to submit your User Content.

6.3. **Training.** Nebula Nova does not use User Content to train any AI model. For Gateway Access, the AI Providers' commercial terms, as of the effective date, exclude training on API inputs and outputs by default, and we have not opted in [confirm per route]. For Direct Access, your agreement and settings with the AI Provider govern training.

6.4. **What Leaves Your Machine.** A Worker may send its AI Provider prompts, any file or command output it can read, and large parts of a repository, depending on the client, its configuration, the permissions you enable, and your instructions. With Direct Access it goes to the AI Provider and we cannot see it. With Gateway Access our gateway routes and meters it. AgentD itself sends us only the following, and only as described. (a) **Registration**, once per machine, when reporting is on and a network is available: your activation code, an installation id, the AgentD version, operating system and processor type, and your acceptance record from Section 1.2; we answer with an installation credential that AgentD keeps on that machine and uses for (b) and (c), and the activation code is not sent again. (b) A **daily usage report**: the installation id, version, operating system, processor type, the UTC day, and that day's counts of handoffs, workers started, finished and failed, sessions and users, tied to your account. (c) **Feedback you choose to send** from AgentD: your text, a rating and category if you give them, the same installation fields, and, only if you include them, a diagnostic report and a screenshot. AgentD never sends code, prompts, file paths, repository names, Outputs or Credentials. When we receive any of these we also see the sending IP address and the client version string, and we derive an approximate location (country and city) from the IP address. You may turn automatic reporting off at any time with `agentd config set telemetry.enabled false` or the `DO_NOT_TRACK` environment variable: that stops registration and daily reports, does not stop feedback you send on purpose, and does not change how the Software works. During the private beta reporting is on by default and AgentD tells you so when you activate. We may revoke an installation credential, which stops that machine's reports and nothing else. The Privacy Policy describes this data too.

6.5. **Usage Metadata.** We collect usage metadata (such as model, token counts, timestamps, and key ids) for billing, usage reports, security, and improving the Services, and do not sell it or your User Content. We may keep de-identified metadata that cannot reasonably be linked to any individual, and will not re-identify it.

6.6. **Retention and Deletion.** We keep: (a) stored content until you delete it or your account is deleted; (b) Gateway request and response content for 90 days; (c) usage metadata and billing records for 90 days, or longer where tax law requires; (d) account records for 90 days after account closure; (e) security logs for 90 days; (f) support messages for 90 days; and (g) the record of your AgentD activation code for as long as your account has beta access, so that the Console can show you the same code; (h) AgentD registration and usage-report events, including the IP addresses and locations received with them, for 24 months, deleted on a schedule; and (i) feedback you send from AgentD or the Console for 24 months, or until you ask us to delete it. Backups are erased, and hosting subprocessors delete their copies, within 30 days after our primary copy is deleted. We keep specific data longer only for a legal hold or open dispute. You may delete stored content yourself or through support, which confirms within 30 days. Gateway AI Providers retain Gateway content for the periods their Gateway Provider Terms set; Direct Access retention follows Section 5.2. You control self-hosted installations.

6.7. **Feedback.** We may use feedback you give without obligation to you, but not your confidential information or personal data within it.

## 7. Acceptable Use

7.1. You will not use, or let Workers, Authorized Users, or others use, the Software to: (a) violate law or third-party rights; (b) create or distribute malware, or commit fraud; (c) access systems, data, or workspaces without authorization; (d) change repositories or open pull requests without permission; (e) circumvent security, rate limits, credit checks, or safety measures; (f) violate applicable AI Provider terms or usage policies; or (g) extract model weights or proprietary system internals.

7.2. **Enforcement.** If we reasonably believe this Section is breached, we may act proportionately (such as blocking a request or suspending access) after notice and a chance to cure where practicable, and immediately only for a legal requirement, security risk, or risk to our AI Provider accounts. On request, someone who did not make the decision will review it within 14 days.

## 8. AI-Generated Output, Agent Risks, and Costs

8.1. **Accuracy.** Outputs may be wrong, incomplete, insecure, or out of date.

8.2. **Review.** Review Outputs before relying on them, and review every Worker change before merging or deploying it.

8.3. **Worker Actions.** Workers edit files, run commands, commit, and open pull requests under the permissions and instructions you give them. You are responsible for their actions within those limits, but not to the extent an action results from our Software defect, security failure, breach, or negligence, or our instructions beyond your configured permissions.

8.4. **No Professional Advice.** Outputs are not legal, medical, financial, tax, or other professional advice.

8.5. **High-Risk Uses.** You will not use Outputs where failure could cause death, injury, or severe damage (such as in critical infrastructure, medical devices, or weapons), or for decisions with legal or similarly significant effects on people (such as employment, credit, or housing) unless law and AI Provider terms permit it and a qualified person reviews each decision.

8.6. **Costs.** Loops, retries, and parallel Workers can raise Direct Access and Gateway Access usage sharply. Subject to Sections 4.2, 5.5, and 8.3, you are responsible for usage under your account and Credentials, including unexpected usage.

8.7. **Billing.** Purchased credits are prepaid and do not expire while your account is open; Section 12.4 governs them on termination. Free or promotional credits have no cash value. We will disclose any Token Plan auto-renewal before purchase, and you may cancel before the next renewal. Recurring-plan price increases need 30 days' notice and apply from your next renewal. Prices exclude taxes. If payment fails, we may pause Gateway Access until paid.

## 9. Intellectual Property and Trademarks

9.1. **Ownership.** We and our licensors own the Software and the LibraOS and Libra Desk names and logos.

9.2. **Trademarks.** You may not use our names or logos without written permission, except to refer accurately to LibraOS or Libra Desk without implying our endorsement.

9.3. **Open Source.** Section 3.2 governs open source components.

9.4. **Copyright Complaints.** Send Digital Millennium Copyright Act notices to our designated agent: [registered DMCA agent].

## 10. Warranty Disclaimer

10.1. TO THE EXTENT THE LAW ALLOWS, THE SOFTWARE AND OUTPUTS ARE PROVIDED "AS IS" AND "AS AVAILABLE", AND NEBULA NOVA DISCLAIMS ALL IMPLIED WARRANTIES, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.

10.2. WE DO NOT WARRANT THAT THE SOFTWARE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE, THAT OUTPUTS WILL BE ACCURATE, OR THAT ANY MODEL WILL REMAIN AVAILABLE. PRIVATE BETA AND PREVIEW FEATURES MAY CHANGE OR END.

10.3. **Self-Hosting.** You are responsible for the infrastructure you self-host the Software on.

10.4. **Mandatory Warranties.** This Section 10 does not exclude non-excludable statutory warranties; where law permits limiting their remedy, it is re-supply or refund, at our choice.

## 11. Limitation of Liability and Indemnity

11.1. **Consumer Rights.** Nothing in this Agreement limits rights that applicable law, including consumer protection law, makes non-waivable; Sections 10, 11.2, 11.3, and 11.5 apply only as far as that law allows.

11.2. **Excluded Damages.** TO THE EXTENT THE LAW ALLOWS, NEITHER PARTY IS LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR LOST PROFITS, REVENUE, OR GOODWILL.

11.3. **Cap.** TO THE EXTENT THE LAW ALLOWS, NEBULA NOVA'S TOTAL LIABILITY UNDER THIS AGREEMENT IS LIMITED TO THE GREATER OF THE AMOUNTS YOU PAID US IN THE 12 MONTHS BEFORE THE CLAIM AROSE AND USD $100. A CLAIM THAT WE CAUSED UNEXPECTED DIRECT ACCESS CHARGES IS SUBJECT TO THIS CAP, EXCEPT AS SECTION 11.4 PROVIDES.

11.4. **Exceptions.** Sections 11.2 and 11.3 do not apply to liability for death or personal injury caused by negligence, fraud, gross negligence, wilful misconduct, our breach of Section 6 or of our confidentiality or data-protection obligations, or Section 11.6.

11.5. **Your Indemnity.** If you are not a Consumer, you will defend and indemnify Nebula Nova against third-party claims to the extent caused by your or your Authorized Users' breach or your unlawful or infringing User Content.

11.6. **Our IP Indemnity.** If you are a "**Business Customer**" (a non-Consumer that paid us fees in the 12 months before the claim), we will defend you against third-party claims that our proprietary components, as provided and used under this Agreement, infringe a patent, copyright, or trademark or misappropriate a trade secret, and pay damages finally awarded and settlements we approve. Excluded are Outputs, User Content, open source components, AI Provider models and clients, changes we did not make, and combinations, but only where the claim would not have arisen without combining our components with something we did not provide, require, document, or reasonably anticipate. If use is or may be enjoined, we will at our expense secure continued use or make the component non-infringing with materially the same function, or else end the affected service and refund unused prepaid fees. This Section is your exclusive remedy for third-party infringement claims about the Software.

11.7. **AI Providers.** This Agreement does not release or limit any claim you have against an AI Provider.

11.8. **Claim Procedure.** For Sections 11.5 and 11.6, the defended party will give prompt written notice (delay excuses the other only to the extent prejudicial), let the defending party control the defense, and reasonably cooperate. The defending party reimburses reasonable out-of-pocket cooperation costs and any separate counsel a conflict of interest requires; otherwise the defended party may add its own counsel at its own cost. No settlement may admit fault for, or bind, the defended party without its consent, not unreasonably withheld.

## 12. Term, Termination, and Suspension

12.1. **Term.** This Agreement runs from your acceptance until terminated.

12.2. **By You.** You may terminate at any time by closing your account in the Developer Console.

12.3. **By Us.** We may suspend or terminate access, proportionately and with notice under Section 7.2, if: (a) you materially breach this Agreement (substantially breach Section 3.3, 7, or 13.3, or cause or risk significant harm to others) and fail to cure within 14 days after notice, or 30 days if cure reasonably needs longer and you pursue it diligently (incurable breaches have no cure period); (b) your use poses a security risk; (c) an AI Provider, payment processor, or law requires it; or (d) undisputed payment is over 30 days overdue. We may also close an account unused for 24 months with no paid balance on 30 days' email notice, or terminate for convenience on 60 days' notice.

12.4. **Effect.** On termination the Section 3 license ends, except open source licenses and, unless we terminate under Section 12.3(a), your license to the AgentD Core versions you have obtained, which continues under Section 3.1. For 30 days you may export User Content, read-only or, where that is unlawful or unsafe, by other secure means, even after a payment dispute or AI Provider demand; we then delete it under Section 6.6. Whoever terminates and why, unused purchased credits are refunded at the price paid, never forfeited. Unused Token Plan days are refunded pro rata if we terminate or end a paid service without your breach, or either party terminates under Section 5.3, 13.4, 13.6, or 13.7; otherwise there is no refund unless mandatory law requires one. Refunds, less only undisputed amounts you owe, go to your original payment method within 30 days. Mandatory law, including consumer, gift-card, and stored-value rules, prevails over this Section and the Billing Terms. Surviving: Sections 2; 6.1, 6.3, and 6.5 to 6.7; 6.2 until deletion under Section 6.6; 8 for prior use; 9 to 11; 12.4; 13; and 14.

## 13. Governing Law, Disputes, and General Terms

13.1. **Governing Law.** Delaware law governs this Agreement, without regard to conflict-of-law rules; the UN Convention on Contracts for the International Sale of Goods does not apply.

13.2. **Disputes.** Before suing, a party will send the other a dispute notice at its notice address (ours: Section 14) giving its name, contact details, the facts, and the relief sought, and the parties will try to resolve the dispute informally for 30 days after receipt, during which limitation periods are tolled to the extent law permits. This step does not apply to urgent interim or injunctive relief, or where delay would bar or prejudice a claim by law. Claims then go to the state or federal courts in Wilmington, Delaware, whose jurisdiction both parties accept; a Consumer may also sue in their local courts where local law allows.

13.3. **Export Controls.** You will comply with applicable export control and sanctions laws, including U.S. law, and represent that you are not in an embargoed country or on a restricted-party list.

13.4. **Changes.** We will notify you of every change by email or in the Services, and no change is retroactive. A material change (one that adversely affects your rights or obligations) needs 30 days' notice and your acceptance under Section 1.2; until then the prior version applies. Other changes take effect on the noticed date, at least 7 days later. If you do not accept a material change, the prior version continues for any prepaid period unless law or an AI Provider requirement prevents it, and we may then end your access with a refund under Section 12.4.

13.5. **Entire Agreement.** This Agreement, with the documents and obligations Sections 1.4 and 5.3 incorporate, is the entire agreement between us about the Software.

13.6. **Assignment and General.** Either party may assign this Agreement, with notice, to a successor to substantially all of its relevant business that assumes it in writing; other assignments need the other party's consent, not unreasonably withheld. The assignor is released only from obligations the assignee assumes. If we assign, you may terminate within 30 days of notice. An assignment or change of control does not change the terms that apply to Software versions you have already obtained. A failure to enforce is not a waiver. An unenforceable provision does not affect the rest.

13.7. **Force Majeure.** Neither party is liable for failures caused by events beyond its reasonable control, including AI Provider outages, if it gives prompt notice and reasonably mitigates, but payment for services received is not excused. If such an event makes the Services materially unavailable for over 30 consecutive days, either party may terminate the affected service.

## 14. Contact

Nebula Nova Inc., a Delaware corporation, Attn: Legal. Legal notices: [legal notices email]. Security reports: [security email]. Support and review: [support email].
