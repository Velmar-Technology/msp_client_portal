# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [1.12.2](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.12.1...v1.12.2) (2026-09-21)


### Features

* **byok:** add Google Gemini as first-class BYOK provider ([b03e046](https://github.com/Velmar-Technology/msp_client_portal/commit/b03e0465d53eddf1050d91cbce8b1e1f89dd9352))
* **client:** add document titles for crm and vaultwarden routes ([a11d486](https://github.com/Velmar-Technology/msp_client_portal/commit/a11d486a1f1187e88247d5df6f4f0a60dba958c0))
* **client:** implement unified compound slot architecture for Page header and actions ([e584d0e](https://github.com/Velmar-Technology/msp_client_portal/commit/e584d0ef48cbf0b3cd9276f921403d427d495558))
* **client:** migrate DevicesPage and ResourcesPage to Page view modes architecture ([4dcb444](https://github.com/Velmar-Technology/msp_client_portal/commit/4dcb44477d65b70e1fd7fe7b4ccc4b6aa65e8e34))
* **client:** set dynamic document title as page name plus Portal suffix ([66150cb](https://github.com/Velmar-Technology/msp_client_portal/commit/66150cbfdf05e3266409556e0b2d8768107b4c61))
* **client:** switch sidebar to icon-only collapsed mode ([059c329](https://github.com/Velmar-Technology/msp_client_portal/commit/059c3291eb65b8becfea9f6b8f24c23c8b950ce2))
* **crm:** migrate CRM pipeline to Page multi-view architecture with calendar and analytics views ([0afc600](https://github.com/Velmar-Technology/msp_client_portal/commit/0afc6005dd1e148365817e721751153539916845))
* **equipment:** add device RMM modal with telemetry and patch management ([ae1bfc7](https://github.com/Velmar-Technology/msp_client_portal/commit/ae1bfc71686c7b2d23e9f6ba60ea7fd56f9db4a1))
* **equipment:** launch device RMM dashboard from actions menu and card ([ad87f4c](https://github.com/Velmar-Technology/msp_client_portal/commit/ad87f4c408e8548408c054e7f2c70b54820f3c8d))
* **financial:** migrate finance page to Page multi-view with ledger and analytics ([efb4feb](https://github.com/Velmar-Technology/msp_client_portal/commit/efb4feb683f6c996390e74734c1eb30e2de2534d))
* **nav:** add cross-device sidebar nav counters with live SSE updates ([51519c4](https://github.com/Velmar-Technology/msp_client_portal/commit/51519c4f788f47a4333bad6d5b5f9cf38e352a99))
* **nav:** refine ticket counter into actionable unread attention model ([9d0100d](https://github.com/Velmar-Technology/msp_client_portal/commit/9d0100d5ee6cbb89de2b55862588bb4a49bc78e7))
* **nav:** refine ticket counter into actionable unread attention model ([7e18420](https://github.com/Velmar-Technology/msp_client_portal/commit/7e1842026efe12baf446b5f940795c89dfa1d556))
* **tickets:** migrate ticket filters to Page header toolbar and compact kanban cards ([26f8590](https://github.com/Velmar-Technology/msp_client_portal/commit/26f8590b1f83cbc29006c102e2672107d5eacd28))


### Bug Fixes

* **client:** call useNavigate unconditionally in PageBack ([b2138aa](https://github.com/Velmar-Technology/msp_client_portal/commit/b2138aac80cf96c9d13be2e6ab107a4fab42d1c0))
* **client:** center sidebar nav and footer icons in collapsed icon mode ([a821569](https://github.com/Velmar-Technology/msp_client_portal/commit/a821569da5d176e45e7ab90dc55c014b2a0c54b8))
* **infra:** add trailing slash redirect for vaultwarden in traefik and harden nginx static fallback ([3701959](https://github.com/Velmar-Technology/msp_client_portal/commit/370195985b348abd09ca3655f6002f6443d0ed3f))
* **nav:** remove restricted raw db imports from NavCounterService ([e69b3f1](https://github.com/Velmar-Technology/msp_client_portal/commit/e69b3f107fe6ec7eaa068e81478bb53f35735bb9))
* **settings:** restore zero-knowledge notice on password manager page ([e6b2365](https://github.com/Velmar-Technology/msp_client_portal/commit/e6b2365aa926bdb39c8c155e79a94b4bbee54117))
* **tickets:** prevent recurring escalation sweep loops and notification spam ([23e87bb](https://github.com/Velmar-Technology/msp_client_portal/commit/23e87bb9ce13442c31c21179fd2bc5f2544b90b4))
* **tickets:** resolve circular dependency between TicketStatusService and TechnicianEarningsService ([bf0eaba](https://github.com/Velmar-Technology/msp_client_portal/commit/bf0eaba1b23044e07925ee4dd095b8e1950d1360))

## [1.12.1](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.12.0...v1.12.1) (2026-09-18)


### Features

* **client:** add first-class tab navigation support to Page component ([ba62d19](https://github.com/Velmar-Technology/msp_client_portal/commit/ba62d19045cf6a11d310e64ee24df4e978da8215))
* **client:** force Page content to take whole width by default ([3624823](https://github.com/Velmar-Technology/msp_client_portal/commit/362482366d91ae5fb2a5eeaa88b64cda0b74ee10))
* **client:** introduce dashboard, calendar, and graph views to Page ([ed07e14](https://github.com/Velmar-Technology/msp_client_portal/commit/ed07e145b5e75e9dead90340077bda2388eed1e6))
* **client:** introduce odoo-style form view and kanban board architecture ([65eaf50](https://github.com/Velmar-Technology/msp_client_portal/commit/65eaf50123d72a1ce451597a3824aac8f32dbea6))
* **client:** introduce odoo-style view architecture to Page component ([93cbd99](https://github.com/Velmar-Technology/msp_client_portal/commit/93cbd99aa4761b511f98db2010ca0b61a334bfd3))
* **financial:** migrate FinancialPage to use Page.Dashboard view architecture ([e8677b0](https://github.com/Velmar-Technology/msp_client_portal/commit/e8677b054ec91fc63cc3dad1fcdb971a902635d1))
* **rmm:** migrate MaintenancePage to Page Date view architecture ([167d909](https://github.com/Velmar-Technology/msp_client_portal/commit/167d909f01eb76bf2f96500465205bf42f45c403))
* **scripts:** add npm commands to reconstruct and query knowledge graph ([7a7f72d](https://github.com/Velmar-Technology/msp_client_portal/commit/7a7f72dafd38938aa749df934c56c321a0632340))
* **sentinel:** integrate graphify topological intelligence and blast radius workflows ([da04b1a](https://github.com/Velmar-Technology/msp_client_portal/commit/da04b1a54e2c248c4291704ceae17f229cfa11a8))
* **ui:** ensure all pages and layouts span full container width ([47e61c8](https://github.com/Velmar-Technology/msp_client_portal/commit/47e61c85953566e528f2ed5c1f4698f9a4c1c429))


### Bug Fixes

* **client:** resolve PageStatBoxProps empty interface and PageGraph render lint errors ([1dad647](https://github.com/Velmar-Technology/msp_client_portal/commit/1dad6472e4f02733f58e7535a9296ad0435b73f2))

## [1.12.0](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.11.12...v1.12.0) (2026-09-16)

## [1.11.12](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.11.11...v1.11.12) (2026-09-16)


### Features

* **byok:** add web-native BYOK management, Law 172-13 privacy and MCP zero-secret sync ([c802f28](https://github.com/Velmar-Technology/msp_client_portal/commit/c802f285033ecde9e40f731823787fa36ffe4c8a))
* **client:** byok model select, copy-to-clipboard, typography ([7151eb0](https://github.com/Velmar-Technology/msp_client_portal/commit/7151eb06623211160a110b486e920ecd0e87fba2))
* **infra:** add CAF agent deployment, isolated MCP routing and docs ([cc9c87b](https://github.com/Velmar-Technology/msp_client_portal/commit/cc9c87b428023d8f0630f47b8aa9ecdbd274eced))
* **mcp:** add CAF quality agent and multi-tenant BYOK private service ([f667e3d](https://github.com/Velmar-Technology/msp_client_portal/commit/f667e3dc8c01b13dd3b7010d1443f73e6fedda24))
* **mcp:** implement tool profile isolation and dedicated /mcp/caf endpoint ([e224326](https://github.com/Velmar-Technology/msp_client_portal/commit/e2243262c564f350cf4dfa91d1bb0bf58c841992))
* **opencode:** add strategy-architect business model ideation agent ([17421b5](https://github.com/Velmar-Technology/msp_client_portal/commit/17421b5f56ef61f845a9e725df2c88b59d5a4356))
* **rmm:** implement high-throughput telemetry write-behind buffer and clustered mesh ([f4b7ef9](https://github.com/Velmar-Technology/msp_client_portal/commit/f4b7ef9984bdec80be6d636c7da5227eb75ba983))
* **sentinel:** add device relocation operations and update agent skill definitions ([b2cb3f3](https://github.com/Velmar-Technology/msp_client_portal/commit/b2cb3f3f39e7ff635cf097e3a0a33d5589f4c714))
* **ui:** implement Tokyo Night Light palette and unify semantic tokens ([5154367](https://github.com/Velmar-Technology/msp_client_portal/commit/5154367697f548a799f573e423a784d7fc5956a3))


### Bug Fixes

* **billing:** add line_items migration and resolve scheduler cycle ([965a5c7](https://github.com/Velmar-Technology/msp_client_portal/commit/965a5c7033145c813d685552409246c51f87af8c))
* **byok:** allow saving provider/model without re-entering api key ([ffd5b5b](https://github.com/Velmar-Technology/msp_client_portal/commit/ffd5b5b154d765c044624828422499274dbb9a42))
* **byok:** move useMemo above conditional return, fix test for optional apiKey ([d8b81fd](https://github.com/Velmar-Technology/msp_client_portal/commit/d8b81fdd0f2c9fbcaac947260f81a9cf44ccff02))
* **client:** comply with react hook rules in ByokSettingsPage ([30f1de3](https://github.com/Velmar-Technology/msp_client_portal/commit/30f1de3992912a83b435a8fffd9fdb49f8109248))

## [1.11.11](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.11.10...v1.11.11) (2026-09-12)


### Features

* **billing:** support 100% discounted invoices and free plan zero-charge invariant ([089d64b](https://github.com/Velmar-Technology/msp_client_portal/commit/089d64b228b68be8d03891103744d16c855f1460))
* **equipment:** add MSI suite installer packaging and deployment UI ([8eda38b](https://github.com/Velmar-Technology/msp_client_portal/commit/8eda38b744e3c059f7c61d35ae452f1cbde82b3d))
* **equipment:** admin organization owner access and vault reset (BL-205) ([a4b34cd](https://github.com/Velmar-Technology/msp_client_portal/commit/a4b34cdd37fe8522eb42a01a715f406204c09de8))
* **equipment:** seamless workstation vault activation flow (BL-205) ([50d7680](https://github.com/Velmar-Technology/msp_client_portal/commit/50d768072e4ca3b5595c0300f01d61f974794bc7))
* **rmm:** add msp_remote_battery_report tool to mcp-server ([5cce4e6](https://github.com/Velmar-Technology/msp_client_portal/commit/5cce4e6d9f36b2a9bda5c5974af83fa703e9093c))
* **rmm:** add msp_remote_get_hardware_components tool to mcp-server ([4e4dcf3](https://github.com/Velmar-Technology/msp_client_portal/commit/4e4dcf30e58e6ef83361f165a57c755f06a1a931))
* **rmm:** bump default remote agent upgrade target version to 1.11.5 ([39c8f42](https://github.com/Velmar-Technology/msp_client_portal/commit/39c8f42543a015fd9ab45128107cbb790dd00c7d))
* **sentinel:** add BL-205 device vault session remediator and vault guardrails ([3d6582f](https://github.com/Velmar-Technology/msp_client_portal/commit/3d6582f836fca959d4a91febe63a69ae7148399a))
* **sentinel:** streamline 1-step ops and support tenant plans ([4fadafb](https://github.com/Velmar-Technology/msp_client_portal/commit/4fadafbdb8c428068045ec1a1a0baf8541fcf2c1))


### Bug Fixes

* **server:** resolve Vaultwarden 404 invite error with subpath sync and admin fallback ([769f07c](https://github.com/Velmar-Technology/msp_client_portal/commit/769f07c2fab20c4e7f3be45ff8ccd3ae997f69ca))
* **system:** implement Vaultwarden admin session cookie authentication and caching (BL-206) ([0839853](https://github.com/Velmar-Technology/msp_client_portal/commit/08398532459c5d4a01e87c58ff6938fcf3812f07))
* **vault:** resolve 401 in createDeviceCollection and support slot re-enrollment (BL-205) ([102016f](https://github.com/Velmar-Technology/msp_client_portal/commit/102016f975acf05bb9cbe680ddf28e25d25ac97e))
* **vault:** resolve 401 in revokeDeviceSession with admin session fallback (BL-205) ([159cf8d](https://github.com/Velmar-Technology/msp_client_portal/commit/159cf8de1b9e084747266052e93df105969da03e))

## [1.11.10](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.11.9...v1.11.10) (2026-09-11)


### Features

* **agent:** implement windows dpapi machine-bound credential encryption ([ba33ea7](https://github.com/Velmar-Technology/msp_client_portal/commit/ba33ea7f5a4b346ebd45b75c540d3bcc093425ca))
* **sentinel:** add BL-206 vault invitation integrity checker and autonomous remediator ([2bc5657](https://github.com/Velmar-Technology/msp_client_portal/commit/2bc5657ba468594fe33b89c977f0763f645a2bf6))
* **subscriptions:** add PayPal auto-renew toggle and Sentinel BL-402 agreement checker ([f08687b](https://github.com/Velmar-Technology/msp_client_portal/commit/f08687ba26e281ee36e3ca43c99669bad1d6ee53))
* **tray:** add persistent rolling endpoint logging with redaction and diagnostics ([049dbf4](https://github.com/Velmar-Technology/msp_client_portal/commit/049dbf49a37d430c525b2985a456073e41b2dbae))
* **tray:** add seamless service restart, offline state handling, and local timezone logging ([77cccca](https://github.com/Velmar-Technology/msp_client_portal/commit/77ccccad441776dd25d888b87f0bd2f0890a0620))
* **tray:** configure tauri v2 acl capabilities and add installer shortcuts ([0cad781](https://github.com/Velmar-Technology/msp_client_portal/commit/0cad7812c0b0c5e7860d2a1fd53ea43660337806))
* **vault:** add organization auto-resolution and msp_remediate_user_vault tool ([219e650](https://github.com/Velmar-Technology/msp_client_portal/commit/219e650cc0d3ca7be58485f6d57808b58c6a6f3a))


### Bug Fixes

* **infra:** fail fast on missing vaultwarden admin token and document incident ([18d8a5a](https://github.com/Velmar-Technology/msp_client_portal/commit/18d8a5a6a77e398aa8d3785d0e1eda349405753b))
* **tray:** extend tauri v2 acl capability with webviews wildcard and explicit event permissions ([2e0a6a3](https://github.com/Velmar-Technology/msp_client_portal/commit/2e0a6a3ad788e51e6db81544d1aaf2e5ac19973e))

## [1.11.9](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.11.8...v1.11.9) (2026-09-11)


### Features

* **rmm:** add unified WiX MSI installer with dual-channel silent upgrade capability ([664d7ca](https://github.com/Velmar-Technology/msp_client_portal/commit/664d7ca8347bfd25469c52912d13e9378fbbde86))
* **sentinel:** add flapping remediator, dry-run simulation, DLQ, and smart regression synthesis ([d257547](https://github.com/Velmar-Technology/msp_client_portal/commit/d257547d149f2256a3c3be27ba788a832d6bf331))
* **sentinel:** implement business logic integrity auditor and self-healing ([260d18b](https://github.com/Velmar-Technology/msp_client_portal/commit/260d18b5394b167e15530b2304b91a5db8336c6b))
* **subscriptions:** add on-demand equipment quota expansion mcp tool for sentinel ([2947051](https://github.com/Velmar-Technology/msp_client_portal/commit/294705125607417133c63509861b37c08321a793))
* **tray:** add full-stack lightweight i18n support for en_US and es_DO ([56f38c1](https://github.com/Velmar-Technology/msp_client_portal/commit/56f38c18af2b7213e8d5fcfc69cae2d5ec5282e0))
* **tray:** implement workstation activation gate for unbound endpoints ([9c3a50d](https://github.com/Velmar-Technology/msp_client_portal/commit/9c3a50d49a054cb193cfd084df28277a8a006864))


### Bug Fixes

* **installer:** resolve SCM service start timeout and running process conflicts ([5f20a71](https://github.com/Velmar-Technology/msp_client_portal/commit/5f20a71162cd27548beb4d45e7c59c9887a00fc4))
* **sentinel:** resolve import typo, refine state machine checks, and align bounty remediator schema ([f58afd4](https://github.com/Velmar-Technology/msp_client_portal/commit/f58afd475c663cc7d5764a1ed9a997bcbd303fb8))

## [1.11.8](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.11.7...v1.11.8) (2026-09-11)


### Features

* **tickets:** decouple responses card into responsive odoo chatter overlay with internal notes ([0d3f5b9](https://github.com/Velmar-Technology/msp_client_portal/commit/0d3f5b924da5537a14ed77aadeae3fa182f378ab))
* **tray:** allow copying ticket id on click ([ccb1758](https://github.com/Velmar-Technology/msp_client_portal/commit/ccb175835c58511dea9f214578e7f9443e49e60f))

## [1.11.7](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.11.6...v1.11.7) (2026-09-10)


### Features

* **tickets:** align categories with backend and optimize tray UX ([e245a4c](https://github.com/Velmar-Technology/msp_client_portal/commit/e245a4c673bee0cb3f89af6a523e0e7e69e5575d))
* **tickets:** implement realtime bidirectional chat streaming and identity sync ([39b287c](https://github.com/Velmar-Technology/msp_client_portal/commit/39b287c036e1300e3b45ece3bcdebbd5212782e9))
* **tray:** centralize hide-window IPC and add dev mock data ([aad66c0](https://github.com/Velmar-Technology/msp_client_portal/commit/aad66c07bcdff7d8efebd4f7ffa8331c859567c2))

## [1.11.6](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.11.5...v1.11.6) (2026-09-10)


### Features

* **tickets:** add named pipe IPC bridge linking msp-tray to msp-agent ([ba47aa0](https://github.com/Velmar-Technology/msp_client_portal/commit/ba47aa0067a1e990404d5018e9320e321ac0cfa4))
* **tickets:** add workstation ticket list and thread navigation to msp-tray ([97577a8](https://github.com/Velmar-Technology/msp_client_portal/commit/97577a8c2350bad739b66d95882ae2111cfc121c))


### Bug Fixes

* **tray:** automatically show drawer window on manual launch ([c696f45](https://github.com/Velmar-Technology/msp_client_portal/commit/c696f453d6abcb6ef4d92fb97cbe6c90a55a66b7))
* **tray:** use tauri async runtime for background named pipe task ([00f0d2e](https://github.com/Velmar-Technology/msp_client_portal/commit/00f0d2e72d350e51793675570cb59839740dc681))

## [1.11.5](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.11.4...v1.11.5) (2026-09-10)


### Features

* **tray:** default to production helpdesk domain and auto-discover agent identity ([7177cc6](https://github.com/Velmar-Technology/msp_client_portal/commit/7177cc63045fc730149fdec33a2d8023ebd54ef3))


### Bug Fixes

* **core:** reconcile telemetry online status and BL-601 health API ([75bb1db](https://github.com/Velmar-Technology/msp_client_portal/commit/75bb1dba0ea069b6e3175feb5a8200baeb8f4b48))
* **server:** prevent fallback dummy telemetry in prod ([9196689](https://github.com/Velmar-Technology/msp_client_portal/commit/91966899127575a3a960ebb4d8f096c95268d634))
* **tray:** enable custom-protocol and relative base for production builds ([68b2d74](https://github.com/Velmar-Technology/msp_client_portal/commit/68b2d74269d541243f87679477a795a670fef83a))

## [1.11.4](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.11.3...v1.11.4) (2026-09-09)

## [1.11.3](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.11.2...v1.11.3) (2026-09-09)


### Features

* **ci:** automate mcp-server build, security scan, and deploy in deploy.yml ([ee69641](https://github.com/Velmar-Technology/msp_client_portal/commit/ee696414bd844c79e0422e925c5110c771161ae0))
* **mcp-server:** add msp_list_plans tool to export subscription pricing catalog ([2cd7c74](https://github.com/Velmar-Technology/msp_client_portal/commit/2cd7c74990cc83b33dc9b71e1cec71ce190b5785))
* **mcp-server:** add network audit, storage analysis, and enhanced security tools ([c07a61f](https://github.com/Velmar-Technology/msp_client_portal/commit/c07a61f4f9b20919677290af1b854052ebd226d3))
* **mcp-server:** enforce MSP_API_URL and MSP_API_KEY as mandatory configuration parameters ([57ffe6a](https://github.com/Velmar-Technology/msp_client_portal/commit/57ffe6accc608d254016944c022f022ff75d060c))
* **mcp:** add domain diagnostics, system api status, and email inspection tools ([dfc17c4](https://github.com/Velmar-Technology/msp_client_portal/commit/dfc17c4386ffc097211a22e94e69776359f33e6d))
* **rmm:** add autonomous self-upgrade mechanism for msp-agent ([b3d9be6](https://github.com/Velmar-Technology/msp_client_portal/commit/b3d9be608da04d6b656d381588ab665af02db5c3))


### Bug Fixes

* **mcp-server:** ensure resolveApiUrl appends api/v1 prefix to MSP_API_URL ([e52fc7c](https://github.com/Velmar-Technology/msp_client_portal/commit/e52fc7ce45c9279d3ae38af24f2229b35752280e))

## [1.11.2](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.11.1...v1.11.2) (2026-09-08)


### Bug Fixes

* **system:** isolate vault reset rate limiter key and prefix ([46e9a20](https://github.com/Velmar-Technology/msp_client_portal/commit/46e9a2039c2e0a0b8a330e73a9ddd24297421abe))

## [1.11.1](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.11.0...v1.11.1) (2026-09-08)


### Bug Fixes

* **server:** prevent premature db pool closure and unmask startup errors ([44ad732](https://github.com/Velmar-Technology/msp_client_portal/commit/44ad73236242845a23193d32d21d91dc163a6ac8))

## [1.11.0](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.10.2...v1.11.0) (2026-09-08)


### Bug Fixes

* **deps:** deduplicate tsx and sync lockfile to resolve ci etxtbsy ([e0d01f6](https://github.com/Velmar-Technology/msp_client_portal/commit/e0d01f696a358ac585b66d3e33062b3319ad034d))

## [1.10.2](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.10.1...v1.10.2) (2026-09-08)


### Features

* **release:** add msp-tray desktop companion to automated releases and downloads ([16f5147](https://github.com/Velmar-Technology/msp_client_portal/commit/16f5147b7e0d39a74c6b1a2640f0d3958f2f23a2))
* **tickets:** add endpoint agent no-login ticket creation and realtime tray chat ([ec2c876](https://github.com/Velmar-Technology/msp_client_portal/commit/ec2c876cce4bd64ce05908ed5c278bde6d5656c7))
* **tray:** add tauri v2 desktop support assistant and velmar branding ([0bbbf3d](https://github.com/Velmar-Technology/msp_client_portal/commit/0bbbf3dd3cfcef2d4e10b7e5b7baa7bb2c7925f9))
* **vault:** implement device-bound password vaults and BL-702 graceful non-payment lifecycle ([936a8fd](https://github.com/Velmar-Technology/msp_client_portal/commit/936a8fde326a33a0ffbccbffe5255dabc720bb76))


### Bug Fixes

* **equipment:** resolve EquipmentRepository type incompatibilities ([ab40b22](https://github.com/Velmar-Technology/msp_client_portal/commit/ab40b22f61b7351648b8aa63ab1249fcfb07b304))
* **server:** bundle migrate.js and resolve paths for production container health ([e309c2a](https://github.com/Velmar-Technology/msp_client_portal/commit/e309c2a944852a04c6fd165021bf385168907da6))
* **tickets:** use explicit type modifier for re-exported types under isolatedModules ([a65e4be](https://github.com/Velmar-Technology/msp_client_portal/commit/a65e4beb18973215ced407d1cd95cb9aefd3e06e))

## [1.10.1](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.10.0...v1.10.1) (2026-09-03)


### Bug Fixes

* **docker:** copy and build packages/contracts in client and server Dockerfiles ([220635c](https://github.com/Velmar-Technology/msp_client_portal/commit/220635c5310ef483cea0f3264e4f9753d5922df3))

## [1.10.0](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.9.0...v1.10.0) (2026-09-03)


### Features

* **billing:** migrate billing and expenses to @shared/contracts and TanStack Query ([4ac5469](https://github.com/Velmar-Technology/msp_client_portal/commit/4ac5469ff656b07cfedbd0ce9659f275e9088b35))
* **billing:** migrate billing module to ADR-002 colocated architecture ([5d2fe5d](https://github.com/Velmar-Technology/msp_client_portal/commit/5d2fe5d08edd577d6a5ef2884535f6cc0231a90f))
* **client:** enforce ADR-002 feature architecture and add scaffolding engine ([6944b87](https://github.com/Velmar-Technology/msp_client_portal/commit/6944b87eff3ec5ae28101f43fb1e75fcda887f3b))
* **client:** migrate to SOTA React Router v7 Data Mode with colocated feature manifests (ADR-003) ([fa15bb3](https://github.com/Velmar-Technology/msp_client_portal/commit/fa15bb352c1713e5561ada2cf88dba2e16ec211d))
* **contracts:** implement @shared/contracts and TanStack Query tickets pilot ([dd90f2f](https://github.com/Velmar-Technology/msp_client_portal/commit/dd90f2f7f227528246d599e1587b05f1d5ae7c69))
* **contracts:** migrate equipment and subscriptions to @shared/contracts and TanStack Query ([0361add](https://github.com/Velmar-Technology/msp_client_portal/commit/0361add4915ad42ce83d09560c390bbd4017afb8))
* **equipment:** migrate equipment module to ADR-002 colocated architecture ([ebae1b7](https://github.com/Velmar-Technology/msp_client_portal/commit/ebae1b771fa1bfae0c729e80634b632cf463071f))
* **infra:** sota infrastructure overhaul and architectural conformance ([dc960a0](https://github.com/Velmar-Technology/msp_client_portal/commit/dc960a0a193b329bdcd5b7e980324df89b631e30))
* **subscriptions:** add subscription conditional page and feature gating ([77ad50c](https://github.com/Velmar-Technology/msp_client_portal/commit/77ad50c51b2f2819617bcf09b82b4604ebcd82ab))
* **system:** implement self-service vaultwarden password reset and re-invitation ([470aacf](https://github.com/Velmar-Technology/msp_client_portal/commit/470aacf688ffb96fa89f00285892ff178e40a5d5))


### Bug Fixes

* **crm:** add migration 038 for custom plan columns on plans table ([7c00b76](https://github.com/Velmar-Technology/msp_client_portal/commit/7c00b76b76f7861227d92e1966e5d61f1ffc6b09))
* **financial:** correct i18n keys and contract category mapping in LogExpenseDialog ([d97f9a5](https://github.com/Velmar-Technology/msp_client_portal/commit/d97f9a54a2b7e4d05460422b1b27c981aa7b5962))

## [1.9.0](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.8.7...v1.9.0) (2026-09-02)


### Features

* **client:** add composed design primitives, lint guardrails and style guide ([a73f36c](https://github.com/Velmar-Technology/msp_client_portal/commit/a73f36c69151e82095a0f4cbf6aaf7d33d29b3e7))
* **client:** add custom plan studio with CRM integration ([3af91af](https://github.com/Velmar-Technology/msp_client_portal/commit/3af91af9fd35211f8e2de3942af0deba7834ec94))
* **client:** add dedicated PlanEditorPage and enhance feature catalog parameters ([687304c](https://github.com/Velmar-Technology/msp_client_portal/commit/687304c8f4521a04897d6a72acb75e4ab4a2ab71))
* **client:** add feature pricing rules and plan cost calculator ([16d202d](https://github.com/Velmar-Technology/msp_client_portal/commit/16d202def275e92b4649d24a325e9ed2f6cf73d6))
* **crm:** add backend for bespoke custom plans with lead binding ([7c3d9a3](https://github.com/Velmar-Technology/msp_client_portal/commit/7c3d9a3ebc494c146c4fc40051e542607691b7d0))
* **infra:** add automated Nextcloud Kopia backup to Google Drive with fast DR ([bfe2cf4](https://github.com/Velmar-Technology/msp_client_portal/commit/bfe2cf47be9eb03b367556bd9452ddc687d82961))
* **tickets:** add HELPDESK and AI ticket categories across schema, types, mcp, and client ([c740707](https://github.com/Velmar-Technology/msp_client_portal/commit/c740707b851eb92fcbac1306e8c1d856bb593f27))
* **vaultwarden:** add hosted multi-tenant password manager integration and BL-702 lifecycle hooks ([f5ac891](https://github.com/Velmar-Technology/msp_client_portal/commit/f5ac891545d35316343691ae9481c0ea72f2063b))

## [1.8.7](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.8.6...v1.8.7) (2026-09-01)


### Features

* **billing:** register MCP billing tools and isolate admin tenant from MRR and renewals ([7371a67](https://github.com/Velmar-Technology/msp_client_portal/commit/7371a671cc42e0c6956b7332235a060b73b12533))
* **client:** extract ViewToggle primitive, standardize across pages, and center ChunkErrorBoundary ([1388201](https://github.com/Velmar-Technology/msp_client_portal/commit/1388201632be317b91adefc201550f16772ad3c8))
* **client:** streamline toolbars and compact views across maintenance, devices, and crm ([635868f](https://github.com/Velmar-Technology/msp_client_portal/commit/635868ff9cc916477638077f063bee1d9407bb55))
* **financial:** add technician commission recalculation and table pagination ([2f82132](https://github.com/Velmar-Technology/msp_client_portal/commit/2f821326f654a620df397e94ad046e464a5b4da5))
* **financial:** convert expense breakdown to pie chart and synchronize analytical chart heights ([7a28e4a](https://github.com/Velmar-Technology/msp_client_portal/commit/7a28e4a29f85a22a78f82e493ce9d0ede74f623d))
* **mcp:** add user management tools and agent mcp guardrails ([fdbc2ca](https://github.com/Velmar-Technology/msp_client_portal/commit/fdbc2ca963df17d57c02c738daadc92aab804662))


### Bug Fixes

* **client:** resolve unassigned variable in RevenueChart and normalize height ([1b0a4d1](https://github.com/Velmar-Technology/msp_client_portal/commit/1b0a4d152442974f4d2802f83e5bc1685e70ac04))

## [1.8.6](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.8.5...v1.8.6) (2026-08-31)


### Features

* **equipment:** require OTP pairing code for admin device provisioning ([8927452](https://github.com/Velmar-Technology/msp_client_portal/commit/892745266c7fdce826e12d6b565e941ef63151c2))

## [1.8.5](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.8.4...v1.8.5) (2026-08-31)


### Features

* **agent:** add SMBIOS hardware component serial discovery to msp-agent ([5486567](https://github.com/Velmar-Technology/msp_client_portal/commit/54865676316aaec1250adbc977afc7ff91392017))
* **agent:** package standalone Windows Service installer and silent deployment scripts ([f707877](https://github.com/Velmar-Technology/msp_client_portal/commit/f707877774b57adb48e6623c639ae76b2aa92067))
* **deploy:** support msp-agent for windows x64/x32 and mac apple silicon/intel with signatures and sha256 manifests ([2028830](https://github.com/Velmar-Technology/msp_client_portal/commit/2028830debc4cced2231328e51c150ff5c0f59ba))
* **emails:** align email templates and tokens with logo aesthetic and embed logo ([eaf4a16](https://github.com/Velmar-Technology/msp_client_portal/commit/eaf4a160d96de389cb0b38ed552bbf761fab2398))
* **emails:** dynamically adapt all email notifications to recipient preferred language (i18n) ([4c5775a](https://github.com/Velmar-Technology/msp_client_portal/commit/4c5775a4a6ada6904ff54c0a33f0337eb407279c))
* **equipment:** add MSP agent deployment modal and script provisioning ([fdc92d6](https://github.com/Velmar-Technology/msp_client_portal/commit/fdc92d6529e220044f8ba373cd89248ab67e5227))
* **mcp-server:** implement MCP 2026-07-28 stateless Streamable HTTP transport and dual-mode architecture ([17cfb37](https://github.com/Velmar-Technology/msp_client_portal/commit/17cfb37cc204b2a789466e7f7b50a73ca2df4e40))
* **mcp-server:** require MSP_API_KEY for MCP server authentication ([c347555](https://github.com/Velmar-Technology/msp_client_portal/commit/c347555170ecac67a0a513fde326aaadb41181e9))
* **mcp:** add client list and hardware component serial tracking with chain-of-custody fingerprint ([8039ac0](https://github.com/Velmar-Technology/msp_client_portal/commit/8039ac093a1ac36e03c9fd75ba07e178e07fb81b))
* **mcp:** add msp_get_device_maintenance_report 1-shot unified maintenance dossier tool ([57b7e00](https://github.com/Velmar-Technology/msp_client_portal/commit/57b7e002d57b5d98d64045bd10e7621ea15db241))
* **server:** distribute cron schedulers with distributed locking and graceful shutdown ([4871b0e](https://github.com/Velmar-Technology/msp_client_portal/commit/4871b0e955e86cb30c5a11bc9abc8ad300fec2c6))


### Bug Fixes

* **api-keys:** add migration for description and expiry columns ([0badff9](https://github.com/Velmar-Technology/msp_client_portal/commit/0badff9ece139dacd0a91652a128373e69dde758))
* **server:** skip email service if SMTP settings are blank or incomplete ([cee5869](https://github.com/Velmar-Technology/msp_client_portal/commit/cee5869fc75ceb6b2f98254548c1a222c5373cae))

## [1.8.4](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.8.3...v1.8.4) (2026-08-31)


### Features

* **api-keys:** add key description and forever expiry option ([6e6fd85](https://github.com/Velmar-Technology/msp_client_portal/commit/6e6fd8586d5e88f3e74e0aa61a74d99bda69c1f1))

## [1.8.3](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.8.2...v1.8.3) (2026-08-31)


### Features

* **api-keys:** persist API keys with hashed one-time display ([b162f9d](https://github.com/Velmar-Technology/msp_client_portal/commit/b162f9d03318758eae340f6bdf0163611018e974))


### Bug Fixes

* **docker:** build only errors package to fix image builds ([a4a57d5](https://github.com/Velmar-Technology/msp_client_portal/commit/a4a57d53b06dfc01cf935a4e4a14f7f458ea2b94))

## [1.8.2](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.8.1...v1.8.2) (2026-08-31)


### Features

* **client/profile:** manage API keys with DataTable and ADMIN-only access ([203ddf6](https://github.com/Velmar-Technology/msp_client_portal/commit/203ddf638a50c992b4e37410f66b6ebc21095ed3))
* **register:** add language picker to RegisterPage matching LoginPage design ([ec81409](https://github.com/Velmar-Technology/msp_client_portal/commit/ec81409deb613fee1bdd7a1bdd785b582eb8c705))


### Bug Fixes

* **client/register:** adjust fieldset layout for proper spacing ([263c172](https://github.com/Velmar-Technology/msp_client_portal/commit/263c172941aa3a3dea4dee7a82d680db406ea4ee))
* **client/register:** fix select trigger padding and height to match inputs ([232add5](https://github.com/Velmar-Technology/msp_client_portal/commit/232add51f700455414f181bdb9e373034ec89f56))
* **locales:** remove WhatsApp reference from phone number label ([4cd0035](https://github.com/Velmar-Technology/msp_client_portal/commit/4cd00357e0392eb06f04fc536fa5c084deef4a6c))
* **register:** rename student client type label and adjust confirm spacing ([37c60e2](https://github.com/Velmar-Technology/msp_client_portal/commit/37c60e230fd06888b1020db10b8fdffdb5328d37))

## [1.8.1](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.8.0...v1.8.1) (2026-08-31)


### Features

* **auth:** implement SOTA hybrid authorization engine (BL-302) ([a729984](https://github.com/Velmar-Technology/msp_client_portal/commit/a729984636f725de1f500a97753c0e004c8da9e6))
* **auth:** implement SOTA PoLP, JIT ephemeral access, and workload identity ([a05bcb0](https://github.com/Velmar-Technology/msp_client_portal/commit/a05bcb099e25b3ce405ad87f01e5baa3ae715271))
* **billing:** add technician commissions and 70/30 profit split (BL-801, BL-802) ([09e39f0](https://github.com/Velmar-Technology/msp_client_portal/commit/09e39f052ca7cd9a4d4cb0d4226483770871027d))
* **mcp:** add ZSP ephemeral access, authz decision, and host remediation tools ([93caeda](https://github.com/Velmar-Technology/msp_client_portal/commit/93caeda1b0d3f6e9e5ac8f3e15780298803cb694))
* **server:** add database migration 034 for Section 9 Rates, NCF, and account status ([95b9982](https://github.com/Velmar-Technology/msp_client_portal/commit/95b998298c2e310a31b31f5bea75e2c62ee8ebb3))
* **tickets:** enforce mandatory device slot linking and display remaining plan quota ([f6f1bd3](https://github.com/Velmar-Technology/msp_client_portal/commit/f6f1bd38aaab91af2bf858bcec02afed1a51c460))
* **tickets:** implement business hours and SLA calculation per Section 3.1 & 3.2 ([4fdd1c4](https://github.com/Velmar-Technology/msp_client_portal/commit/4fdd1c4308473dc99805842a00ce1d8a2d921dfb))


### Bug Fixes

* **client:** localize BlockedPortalAlert in AppLayout and add Button primitive ([8a6ac66](https://github.com/Velmar-Technology/msp_client_portal/commit/8a6ac66c1a5ae48a45e5755fb64e3aeed4a19d31))
* **system:** correct billing repository import to comply with module gateway rule ([24a20a7](https://github.com/Velmar-Technology/msp_client_portal/commit/24a20a7266f5e1ea8b7b4ff112639a9a506cf11a))
* **test:** add missing expenseRepository mock in SubscriptionScheduler.test.ts ([c5a1be5](https://github.com/Velmar-Technology/msp_client_portal/commit/c5a1be536e0b58df47cc21c01a6bd91454a57f45))

## [1.8.0] (2026-08-30)

### Features

* **billing:** implement technician closed-ticket commissions, SLA bonuses, pre-split OpEx ledger, and batch payroll approval (`BL-801`)
* **finance:** implement 70/30 net revenue & profit distribution model between HQ and Lead Engineer Admin (`BL-802`)
* **tech-dashboard:** add live earnings metrics, SLA compliance rate, and bounty ledger tab to `TechDashboardPage`
* **financial-dashboard:** add `TechnicianPayrollTable` component with batch payout processing and CSV exports to `FinancialPage`

## [1.7.3](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.7.2...v1.7.3) (2026-08-28)


### Features

* **msp-agent:** add windows background service support, protected self-relocation, and slot persistence ([6df7d4e](https://github.com/Velmar-Technology/msp_client_portal/commit/6df7d4e7dc58fc6da0840807fdc2d4ecdc31fc88))

## [1.7.2](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.7.1...v1.7.2) (2026-08-28)


### Features

* **ui:** standardize table actions columns and controls across application ([da10d59](https://github.com/Velmar-Technology/msp_client_portal/commit/da10d59600123c4e068e87ba36ee25510bdc70f3))


### Bug Fixes

* **client:** add aria-label to plan subscription action button and polyfill storage in test setup ([be91425](https://github.com/Velmar-Technology/msp_client_portal/commit/be91425dfe0dbbbf6900ba6f0624929a8f553499))
* **client:** remove unused icon imports in PlansPage and TechDashboardPage ([24bd9db](https://github.com/Velmar-Technology/msp_client_portal/commit/24bd9db0db7803bc7e491e22667f97ec582050a7))

## [1.7.1](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.7.0...v1.7.1) (2026-08-28)


### Features

* **rmm:** enable WSS support for agent-ws endpoint and configure default gateway URL ([08649a7](https://github.com/Velmar-Technology/msp_client_portal/commit/08649a7026fe67ff4fb3d057264911e8da8e7079))


### Bug Fixes

* **tickets:** filter selectable devices by provisioned status ([574af3e](https://github.com/Velmar-Technology/msp_client_portal/commit/574af3e84b44b7a8d1a3ee8ae4a63ff1b4be904e))

## [1.7.0](https://github.com-work/Velmar-Technology/msp_client_portal/compare/v1.6.1...v1.7.0) (2026-08-28)


### Features

* **agent:** add --help and --version flags ([11ab925](https://github.com-work/Velmar-Technology/msp_client_portal/commit/11ab92570d32d9f0588601f6509ea63c8c1b6bec))
* **equipment:** add agent-issued pairing codes and slot binding ([c50efd5](https://github.com-work/Velmar-Technology/msp_client_portal/commit/c50efd5ae2a6835532015543008eacfa37fbcdde))
* **equipment:** add slot re-pair flow preserving Nextcloud account and data ([06c4ce4](https://github.com-work/Velmar-Technology/msp_client_portal/commit/06c4ce416956385196b0bd6888fb4e2d0a6037ad))


### Bug Fixes

* **client:** remove unused rowIndex in DeviceActionsCellProps and add missing useMemo deps ([271bdc3](https://github.com-work/Velmar-Technology/msp_client_portal/commit/271bdc38f4a4c09255639c7461895c07ab7fe165))
* **shared:** revive Date types in cache and dedupe expiry warnings ([06ebb69](https://github.com-work/Velmar-Technology/msp_client_portal/commit/06ebb696cba830898fdffb6817098f953b3da7a5))

## [1.6.1](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.6.0...v1.6.1) (2026-08-28)


### Features

* **crm:** enhance lead detail sheet with modular architecture, follow-up management, and clean layout ([6c9a8ed](https://github.com/Velmar-Technology/msp_client_portal/commit/6c9a8ed1766463708f291e037074ff2c9e26ec22))
* **infra:** add Redis container and environment wiring to docker-compose.prod.yml ([498ce3a](https://github.com/Velmar-Technology/msp_client_portal/commit/498ce3ada855533b6436b1a1461bbdda10e9ef9c))


### Bug Fixes

* **infra:** serve zabbix frontend under /zabbix/ subpath ([a1793f6](https://github.com/Velmar-Technology/msp_client_portal/commit/a1793f60fc03afc8c2a68043a973ba501f05be4b))
* **ui:** standardize SelectTrigger sizing variants and align form controls across application ([b9a481f](https://github.com/Velmar-Technology/msp_client_portal/commit/b9a481fe50cbe156f15b021928360d7f2f2e721d))

## [1.6.0](https://github.com-work/Velmar-Technology/msp_client_portal/compare/v1.5.5...v1.6.0) (2026-08-27)


### Features

* **equipment:** add automated Nextcloud desktop client deployment ([#16](https://github.com-work/Velmar-Technology/msp_client_portal/issues/16)) ([e99dd44](https://github.com-work/Velmar-Technology/msp_client_portal/commit/e99dd44e4fdd013f95d5ff171d7a73e0d6932613))
* **rmm:** add webhook HMAC verification and ZabbixService resilience ([033d8ad](https://github.com-work/Velmar-Technology/msp_client_portal/commit/033d8adaf43934e2e3f520b464f7f3d598a09aa9))
* **shared:** add Redis-backed tiered cache with distributed locking ([c26f86f](https://github.com-work/Velmar-Technology/msp_client_portal/commit/c26f86fe2ce40f3c1baaac61815d8f7e1c758233))


### Bug Fixes

* **build:** ensure husky prepare script is skipped in production and Docker builds ([95b1e99](https://github.com-work/Velmar-Technology/msp_client_portal/commit/95b1e99578330bef9d2a1865cc9e35d7176c48a4))
* **client:** remove app version display from sidebar footer ([bb13d7f](https://github.com-work/Velmar-Technology/msp_client_portal/commit/bb13d7f3fbdaf64a2c7f8abc977b0a70a8392a2a))
* **rmm:** allow zabbix-webhook to bypass JWT auth ([40b6046](https://github.com-work/Velmar-Technology/msp_client_portal/commit/40b6046468984155762255832e37a19a6a7bff7f))

## [1.5.5](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.5.4...v1.5.5) (2026-08-26)


### Features

* **i18n:** prioritize user preference and fallback to browser language detection ([9106276](https://github.com/Velmar-Technology/msp_client_portal/commit/910627604e1edfc57d4612798ac66f4757d5d20a))
* **tickets:** implement mark as read on first open and align filter dropdown height ([cb42723](https://github.com/Velmar-Technology/msp_client_portal/commit/cb42723019536ae94a3c0d35e81de4d97211199c))


### Bug Fixes

* **client:** resolve empty interface lint error in input-group ([a7cc9b6](https://github.com/Velmar-Technology/msp_client_portal/commit/a7cc9b67d051a50749660c0b3b46f97a3f98cd84))
* **client:** resolve linter warnings and type mismatches in ticket hooks and page ([d532b4b](https://github.com/Velmar-Technology/msp_client_portal/commit/d532b4baba867312a3162f5f4007d870d2f942b7))
* **system:** enhance Nextcloud password generation and provisioning error handling ([a68a54c](https://github.com/Velmar-Technology/msp_client_portal/commit/a68a54ca8ee98a3f14954dff651fae1f36db8163))

## [1.5.4](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.5.3...v1.5.4) (2026-08-24)


### Features

* **equipment:** add admin device registration and management with full test coverage ([1c98327](https://github.com/Velmar-Technology/msp_client_portal/commit/1c983279a9c8874947a1f5f1acd51f674a7aec69))
* **infra:** configure America/Santo_Domingo timezone for all services in production and local stacks ([b18af3e](https://github.com/Velmar-Technology/msp_client_portal/commit/b18af3e363c66251497035827f70608f9f2518da))


### Bug Fixes

* **ci:** normalize Portainer API key format with dynamic JWT/API-key fallback ([f618e05](https://github.com/Velmar-Technology/msp_client_portal/commit/f618e05317a98107816cab17a3cd2c85b74e35f0))
* **ci:** robust portainer stack updater with auto-resolution and diagnostic logging ([c3e2a34](https://github.com/Velmar-Technology/msp_client_portal/commit/c3e2a347377346507d4ea4d3d78aa432c45b6f2d))
* **client:** reorder useState hook declarations before callbacks in useDevicesPage ([60c3566](https://github.com/Velmar-Technology/msp_client_portal/commit/60c356675f2711762e10492f253540cca87061d6))
* **client:** restrict email templates gallery to admin & fix toFixed TypeError in CRM ([3fd0f26](https://github.com/Velmar-Technology/msp_client_portal/commit/3fd0f268ffcee0bd9891865f471e4c5210c12b4f))
* **equipment:** use SubscriptionStatus enum in EquipmentService ([43af71d](https://github.com/Velmar-Technology/msp_client_portal/commit/43af71dbd9d268801a1fd01112bae8ee1251b068))

## [1.5.3](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.5.2...v1.5.3) (2026-08-24)


### Features

* **ci:** deploy production stack via Portainer API with health gate and auto-rollback ([be55ccf](https://github.com/Velmar-Technology/msp_client_portal/commit/be55ccf25a334a4d44253705c28763cddc8223ac))
* **ci:** pre-warm GHCR image pulls on VPS before Portainer stack update ([72f33e5](https://github.com/Velmar-Technology/msp_client_portal/commit/72f33e5a2cc66d26db2f73df6f59aeb573c0877b))
* **deploy:** configure Grafana SMTP and admin email for password reset ([b941ee8](https://github.com/Velmar-Technology/msp_client_portal/commit/b941ee81c491494a4ada2eaaa19c0019176dab96))
* **observability:** add Prometheus metrics telemetry and Grafana scraping ([7a24c7a](https://github.com/Velmar-Technology/msp_client_portal/commit/7a24c7a4315fb339f5789f7eef421f80622d842f))
* **observability:** implement frontend Real User Monitoring with Grafana Faro and self-hosted Alloy collector ([71810bd](https://github.com/Velmar-Technology/msp_client_portal/commit/71810bd3b8081ad61747a08cf6af194726f214c8))
* **rmm:** add rust endpoint agent, websocket gateway relay, and mcp remote tools ([ea2bbe5](https://github.com/Velmar-Technology/msp_client_portal/commit/ea2bbe5ba98e5d09183e07228aef75941580edf8))
* **rmm:** enhance ZabbixService with keep-alive pooling and auto-reauth retry ([255e0a3](https://github.com/Velmar-Technology/msp_client_portal/commit/255e0a34d920e5ecb7d4e532fddcabd81e1bd181))
* **telemetry:** add Datadog RUM Visual Session Replay and Node.js APM distributed tracing ([3a73e5c](https://github.com/Velmar-Technology/msp_client_portal/commit/3a73e5c96c9c9cdaba540b08edaa11b7539a33c7))
* **telemetry:** configure Datadog RUM credentials and session replay sample rate ([0dff612](https://github.com/Velmar-Technology/msp_client_portal/commit/0dff6126139d1dc7b2ef36879889fb5e82683442))


### Bug Fixes

* **ci:** add controlled security-gate bypass and honor .trivy.yaml in security-scan job ([bd60ab4](https://github.com/Velmar-Technology/msp_client_portal/commit/bd60ab4dd8474f5c1f3aa699e0593f15a0a3cd00))
* **ci:** allow self-signed Portainer TLS via PORTAINER_TLS_INSECURE flag ([321bdfd](https://github.com/Velmar-Technology/msp_client_portal/commit/321bdfdb9f9211df978ed862c116879a2fad8506))
* **ci:** enforce HIGH/CRITICAL-only Trivy gate in SARIF mode ([f7f8b33](https://github.com/Velmar-Technology/msp_client_portal/commit/f7f8b336f2f7c281c9d0ce0d8d0843130038aa03))
* **ci:** extend Portainer stack update PUT timeout to 10 minutes ([7afc202](https://github.com/Velmar-Technology/msp_client_portal/commit/7afc202e08cfdc1a18124cf2e0b7289dceda37e4))
* **ci:** resolve repo-root compose path in Portainer stack updater ([4de9848](https://github.com/Velmar-Technology/msp_client_portal/commit/4de984894673ec3bcc7456f9522bf7a60d649729))
* **ci:** skip npm cacache in Trivy scan and clean cache from server image ([5169b68](https://github.com/Velmar-Technology/msp_client_portal/commit/5169b68517b7b89956ac201f53ce58b8c68c170f))
* **ci:** upload Trivy SARIF as workflow artifact instead of code scanning ([c85c03f](https://github.com/Velmar-Technology/msp_client_portal/commit/c85c03fa27a027d7e1e9bcc256216b965dd99e4c))
* **deploy:** update Grafana admin password to meet 12+ character complexity policy ([2039e7f](https://github.com/Velmar-Technology/msp_client_portal/commit/2039e7f510ff108e6a8a79c22689fc74529c9a27))
* **metrics:** standardize Node.js default Prometheus metric names for Grafana dashboards ([0dd7095](https://github.com/Velmar-Technology/msp_client_portal/commit/0dd7095e25d3d7a5ef37caf19216ae58c88f55f5))
* **telemetry:** ensure Datadog RUM stands by gracefully when env variables are empty in tests ([8389fd2](https://github.com/Velmar-Technology/msp_client_portal/commit/8389fd2bf1bbf33d4fdaba484a980f974c0d32b2))

## [1.5.2](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.5.1...v1.5.2) (2026-08-23)


### Features

* **ci:** add CI/quality workflows, automated deploy/rollback scripts, and container healthchecks ([ac374dd](https://github.com/Velmar-Technology/msp_client_portal/commit/ac374dd403879c3fa818c3399b43fbe3eaac8813))


### Bug Fixes

* **ci:** lock Linux platform binaries for lightningcss and @tailwindcss/oxide ([2be77ac](https://github.com/Velmar-Technology/msp_client_portal/commit/2be77ac2088aa76859c2c2c087c706dd614215b8))
* **ci:** resolve OOM in GitHub Actions client tests ([7304521](https://github.com/Velmar-Technology/msp_client_portal/commit/730452174934081e891eb2f54e2bf6cc93c10af7))
* **ci:** resolve worker OOM crashes in client test suite ([c8f04cf](https://github.com/Velmar-Technology/msp_client_portal/commit/c8f04cf8b1f89887909db0bdadfb83a5a465db29))
* **ci:** switch test pool from forks to threads to resolve OOM ([6b0cae6](https://github.com/Velmar-Technology/msp_client_portal/commit/6b0cae6a45cd806e2de0598f45398f3300878c97))
* **client:** guard isEligible call on PayPal upgrade buttons instance and mock in tests ([ad951df](https://github.com/Velmar-Technology/msp_client_portal/commit/ad951df1ae070450c266855028be613b66ca5e6c))
* **client:** guard localStorage.clear in test setup and provide clear mock in api.test.ts ([2ee86d6](https://github.com/Velmar-Technology/msp_client_portal/commit/2ee86d6d3c1e2ae6bb04557262db0e1d3756fc87))
* **client:** prevent infinite re-render loop in NextcloudInfoModal by managing boolean error state ([bfeaf20](https://github.com/Velmar-Technology/msp_client_portal/commit/bfeaf20efef6d69e581959fde186f72e2cd80656))
* **client:** remove non-existent poolOptions property to satisfy tsc build check ([49ee385](https://github.com/Velmar-Technology/msp_client_portal/commit/49ee3856650c11e24b6d727784258f7009321c64))
* **client:** resolve all ESLint errors and enable blocking quality gate in CI ([6e4f432](https://github.com/Velmar-Technology/msp_client_portal/commit/6e4f432982ad579e905a5ad7ac79f5c023d6af4a))
* **client:** resolve quality gate lint warnings for fast refresh, hook dependencies, and explicit types ([b400f02](https://github.com/Velmar-Technology/msp_client_portal/commit/b400f025550d1051a13fc13c8d8f3751d41caa20))
* **client:** update Vitest config for v4 pool rework and cleanup hooks ([e11b309](https://github.com/Velmar-Technology/msp_client_portal/commit/e11b309e91849bc1ddaaf649f75f2b4f3c2e4547))
* **server:** increase DB pinger degraded threshold, add startup connection retry, and defer pinger ([d366f75](https://github.com/Velmar-Technology/msp_client_portal/commit/d366f752064588ea418818663dda485a6b397cd0))
* **server:** resolve all ESLint unused variable and import warnings ([d922a59](https://github.com/Velmar-Technology/msp_client_portal/commit/d922a594032ce4b804cabf68d6e35311dd379851))

## [1.5.1](https://github.com-work/eapolancovelmar/msp_client_portal/compare/v1.5.0...v1.5.1) (2026-08-22)

### Features

* **ui:** adopt Linear-style sidebar with grouped nav and workspace subscription card ([302c488](https://github.com-work/eapolancovelmar/msp_client_portal/commit/302c488b058883222495eedacc4f88a24d2bf5c3))
* **ui:** align CRMPage with platform UI styling standards and add UI style guide documentation ([3b7df34](https://github.com-work/eapolancovelmar/msp_client_portal/commit/3b7df34025149d15990cd78232a0654196bdffc8))
* **ui:** migrate CRM and Plan modals to Sheet drawer and enforce anti-nested cards rule ([d2f1e92](https://github.com-work/eapolancovelmar/msp_client_portal/commit/d2f1e9280a50880a0ce9c3c60be21a3b2c16b8a3))

### Bug Fixes

* **ui:** polish search bar and filter controls in data table and user management ([316d4c4](https://github.com-work/eapolancovelmar/msp_client_portal/commit/316d4c4a0240939b87ae575217a948112beaf7bf))
## [1.5.0](https://github.com/eapolancovelmar/msp_client_portal/compare/v1.4.3...v1.5.0) (2026-08-21)


### Features

* **billing:** add wire transfer payment tab and invoice deep-link support ([324af1e](https://github.com/eapolancovelmar/msp_client_portal/commit/324af1e844b21598b1a13ed5738f2817b70b1d63))
* **crm:** add lead pipeline module and remove legacy plan assignment flow ([583519f](https://github.com/eapolancovelmar/msp_client_portal/commit/583519f2aa3ad2871672ce8710170da1a7475422))
* **crm:** lead deletion, bulk delete, and auto-provisioned client conversion ([b19900f](https://github.com/eapolancovelmar/msp_client_portal/commit/b19900f1f2755da135488c4075a795ed249edc67))
* **crm:** translate activity timeline and add inline lead editing ([be25a87](https://github.com/eapolancovelmar/msp_client_portal/commit/be25a87dde2f073bde3501db29787b934a435654))
* **tickets:** adopt shadcn attachment primitives in TicketDetailPage ([aa3712b](https://github.com/eapolancovelmar/msp_client_portal/commit/aa3712bdc4ea671d28c7fe858948b42817005ba2))
* **ui:** adopt shadcn Calendar via shared DatePicker across date inputs ([1033213](https://github.com/eapolancovelmar/msp_client_portal/commit/10332135665466b6e138162cf8e47b113cfa1567))


### Bug Fixes

* **financial:** resolve undefined expenseKpi reference crashing FinancialPage ([510a64b](https://github.com/eapolancovelmar/msp_client_portal/commit/510a64be57533923b0ad106535032367c97ac626))
* **tickets:** fall back to online technicians when no active pool is available ([9d44ca6](https://github.com/eapolancovelmar/msp_client_portal/commit/9d44ca6108fa8fb1c0a2ab2c442097f7c1b10d04))

## [1.4.3](https://github.com/eapolancovelmar/msp_client_portal/compare/v1.4.2...v1.4.3) (2026-08-20)


### Features

* add data table sorting to UserManagement & Tickets pages, fix i18n hacks in TicketDetailPage ([8323c84](https://github.com/eapolancovelmar/msp_client_portal/commit/8323c84b31abaf5bc5ce4d197361eedbf8d8fe23))
* **arch:** enforce 4-level architectural layering and clean dependency boundaries ([738a122](https://github.com/eapolancovelmar/msp_client_portal/commit/738a12270d9233282965a9c22fb3be65fbb2615c))
* **auth:** implement password reset with Zod validation, AlertDialog modals, and live SMTP email dispatch ([10c76d5](https://github.com/eapolancovelmar/msp_client_portal/commit/10c76d5c7012dfd40c6654650433e5803c248895))
* **auth:** streamline email-link password reset and validate email existence in db ([d788254](https://github.com/eapolancovelmar/msp_client_portal/commit/d788254b913536a32c3b376159f62819a5e42728))
* **mcp:** implement msp support mcp server with live diagnostics, security audits and remediation tools ([d0eaefd](https://github.com/eapolancovelmar/msp_client_portal/commit/d0eaefdce273fb9fc7eaa23ee495c53bb6d043b1))
* **notifications:** add homogeneous email design system, live preview gallery, and transactional email alignment ([3b8a06b](https://github.com/eapolancovelmar/msp_client_portal/commit/3b8a06bd5fc55b6a509110fb05d45c5b8ef471aa))
* **perf:** implement React.lazy code splitting, deferred skeleton loading, and preloading architecture ([6d6eed4](https://github.com/eapolancovelmar/msp_client_portal/commit/6d6eed4bb9894e73d4f8b25ef33616e5d1c36864))
* **plans:** add pagination to ActiveSubscriptionsDashboard and fix subscription upgrade pricing calculation ([ecfa6cd](https://github.com/eapolancovelmar/msp_client_portal/commit/ecfa6cddf9396280f4425fbeec2851e6f59d9ecd))
* **plans:** admin-only Assign Plan sales workspace and client tier-change panel ([434885a](https://github.com/eapolancovelmar/msp_client_portal/commit/434885a87a92cc6b789fb9995ac833c39a36c451))
* **plans:** refactor checkout to shared CheckoutSheet with Zustand stores ([b88029a](https://github.com/eapolancovelmar/msp_client_portal/commit/b88029a305b173f41749ac2ce8942a0c4c811a83))
* subscription lifecycle guards, expiry notifications, and sidebar i18n ([e0b0e3e](https://github.com/eapolancovelmar/msp_client_portal/commit/e0b0e3eaab602a6400e82d036700aeeb6bb41d5f))


### Bug Fixes

* **auth:** sync forgot password email only on modal open transition ([5cac778](https://github.com/eapolancovelmar/msp_client_portal/commit/5cac778b6737df30ba1dfc18c16043ed30ac3d7f))
* **client:** align ConfirmationState types between hook and page to resolve TS build errors ([8ab913b](https://github.com/eapolancovelmar/msp_client_portal/commit/8ab913bd3d9dce685bd402807341a35ce3704301))
* **client:** deduplicate toast notifications and fix ResourcesPage card alignment ([aa7bd92](https://github.com/eapolancovelmar/msp_client_portal/commit/aa7bd925647a0e6f1b80689a7953922ef15c9983))
* **db:** add connection health pinger, recovery state machine, and withRetry utility ([54de270](https://github.com/eapolancovelmar/msp_client_portal/commit/54de2701b2acf903c94f3e7bd1228718615efdde))
* **db:** parameterize prod healthcheck and capture ping error details ([835b4c8](https://github.com/eapolancovelmar/msp_client_portal/commit/835b4c8e909ca4dcc357f8da1e1519a6febb2ab5))
* **rmm:** resolve circular dependency and undefined equipmentRepository in RmmPatchService ([7a5e40d](https://github.com/eapolancovelmar/msp_client_portal/commit/7a5e40d3b23575170c2d0e1686ea99c3a427da05))
* **server:** resolve @shared/* path alias resolution failure in compiled CJS output ([f2be749](https://github.com/eapolancovelmar/msp_client_portal/commit/f2be749cb14db1dba68592face07d1231366f3a0))
* **tickets:** block action button on cancelled tickets and enable partial id search in TopNav ([20b90cb](https://github.com/eapolancovelmar/msp_client_portal/commit/20b90cb94f69601314c364d3be901070bf6bfe4c))
* **tickets:** handle invalid UUID ticket IDs and show 'Ticket ID Invalid' on frontend ([0e4de85](https://github.com/eapolancovelmar/msp_client_portal/commit/0e4de85f2cebf89288486696c4d5da56a11d211c))
* **tickets:** include ticket ID in topnav search query ([55a8fff](https://github.com/eapolancovelmar/msp_client_portal/commit/55a8fff096e07b884ef8301cd139f2335c6bbdd0))
* **ui:** theme-aware thin scrollbars across light/dark modes ([738876c](https://github.com/eapolancovelmar/msp_client_portal/commit/738876cf1c4da542442683ca3446f7bfd8782070))

## [1.4.2](https://github.com/eapolancovelmar/msp_client_portal/compare/v1.4.1...v1.4.2) (2026-08-19)


### Features

* **client:** align DevicesPage tab navigation structure with ApiStatusPage ([656dc9b](https://github.com/eapolancovelmar/msp_client_portal/commit/656dc9bb04c5a9c5d36cf9d50607601ef9d4b0da))


### Bug Fixes

* **i18n,ui:** add missing i18n keys for user management and tickets, restore entrance animations ([bf54a41](https://github.com/eapolancovelmar/msp_client_portal/commit/bf54a41b9981841fb1d6d34183956041132d16ac))

## [1.4.1](https://github.com/eapolancovelmar/msp_client_portal/compare/v1.4.0...v1.4.1) (2026-08-19)


### Bug Fixes

* **billing:** resolve circular dependency in FinancialStatsService, InvoiceManagementService, and InvoicePaymentService ([d698962](https://github.com/eapolancovelmar/msp_client_portal/commit/d69896291f8fc4c7921096a6eaedf358fd25a742))

## [1.3.7](https://github.com/eapolancovelmar/msp_client_portal/compare/v1.3.6...v1.3.7) (2026-08-18)


### Bug Fixes

* **client:** resolve TypeScript build errors and unused imports ([a49fca5](https://github.com/eapolancovelmar/msp_client_portal/commit/a49fca50010e65d07369b5bc735e99a0040f884b))
* **docker:** add dozzle logs service and update zabbix-agent network_mode ([89d2108](https://github.com/eapolancovelmar/msp_client_portal/commit/89d2108e933f2830a7d8d44bba45a78380cd7ec2))
* **ui:** eliminate transition animation and layout jumps on LoginPage ([c30c3b6](https://github.com/eapolancovelmar/msp_client_portal/commit/c30c3b60c5f642da837868ead05812f1c21c715e))
* **ui:** prevent Google SDK re-initialization loop and make fadeIn opacity-only ([36982ac](https://github.com/eapolancovelmar/msp_client_portal/commit/36982accf42f8ccc4c8f750ddbc9f1bd5ef5cdeb))

## [1.3.6](https://github.com/eapolancovelmar/msp_client_portal/compare/v1.3.5...v1.3.6) (2026-08-18)


### Features

* **auth,ui:** enhance OTP verification flow with AlertDialog, InputOTP and fix login error handling ([8288fdd](https://github.com/eapolancovelmar/msp_client_portal/commit/8288fdda47f3b7510fe4143622915da91642901f))
* **auth:** disable autofill and align registration zod validation with backend ([ae668ff](https://github.com/eapolancovelmar/msp_client_portal/commit/ae668ffd597494967bd2a4d9eace92fa77702806))

## [1.3.5](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.3.4...v1.3.5) (2026-08-18)


### Features

* **devices:** add copy-to-clipboard functionality for OTP codes in DevicesPage ([55dff03](https://github.com/Velmar-Technology/msp_client_portal/commit/55dff03))
* **layout:** add public unauthenticated routes for /terms & /privacy with layout guards ([a9a2637](https://github.com/Velmar-Technology/msp_client_portal/commit/a9a2637))
* **rmm:** add Zabbix RMM monitoring, patch management, and telemetry ([dbbbbc7](https://github.com/Velmar-Technology/msp_client_portal/commit/dbbbbc7))
* **rmm:** add last checked & last shutdown telemetry, real-time polling, and full i18n support ([b5e2ab6](https://github.com/Velmar-Technology/msp_client_portal/commit/b5e2ab6))
* **rmm:** add storage volume in GB, fix telemetry query fallback, and refactor dashboard components ([6db924b](https://github.com/Velmar-Technology/msp_client_portal/commit/6db924b))
* **rmm:** surface real telemetry in device table after Zabbix sync ([f0198bb](https://github.com/Velmar-Technology/msp_client_portal/commit/f0198bb))
* **rmm:** upgrade to Zabbix 6 LTS, configure active check telemetry, and add automatic host self-provisioning ([60b6389](https://github.com/Velmar-Technology/msp_client_portal/commit/60b6389))


### Bug Fixes

* **rmm:** prevent telemetry status flashing N/A and render uptime metrics ([b407729](https://github.com/Velmar-Technology/msp_client_portal/commit/b407729))


### Refactors

* **ui:** refactor RMM Dashboard and PatchManagementModal with custom hooks and high-density SaaS design system ([9237c6a](https://github.com/Velmar-Technology/msp_client_portal/commit/9237c6a))


## [1.3.4](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.3.3...v1.3.4) (2026-08-11)

## [1.3.3](https://github.com/Velmar-Technology/msp_client_portal/compare/v1.2.1...v1.3.3) (2026-08-11)


### Features

* **auth:** add whatsapp otp signup and phone number field to profile ([c8a0a93](https://github.com/Velmar-Technology/msp_client_portal/commit/c8a0a9322a9e88cb3717fffc5c3b028fc030c06c))
* **billing:** add admin mark as paid, plan activation, and invoice details modal ([afbf48c](https://github.com/Velmar-Technology/msp_client_portal/commit/afbf48c4c9f83d7c01fdffce1123916b384f1085))
* **billing:** add bank accounts to checkout and handle bank transfer invoice flow with admin notifications ([03eb0c0](https://github.com/Velmar-Technology/msp_client_portal/commit/03eb0c07d5a43d9597f918e569b89b3c17820066))
* **billing:** add invoice cancellation, automatic navigation, and created_at sorting ([7d819f1](https://github.com/Velmar-Technology/msp_client_portal/commit/7d819f108ad6eb5be41232240e3f3ce3fdea630a))
* **billing:** add store discount, updated terms, and 3-day invoice due email notification rate-limiting ([ee7cc3d](https://github.com/Velmar-Technology/msp_client_portal/commit/ee7cc3d13de4fbe8fcc77719cf885cb9a70cd683))
* **billing:** show invoice line items in invoice details modal ([c8cf1ea](https://github.com/Velmar-Technology/msp_client_portal/commit/c8cf1ea04044bc6f245be1b65fc65c25fe7030f8))
* **ci:** add manual deploy trigger with version fallback ([fe87f2c](https://github.com/Velmar-Technology/msp_client_portal/commit/fe87f2c939ccdfc3e15ac474bc98fafe2c57414d))
* **devices:** add OTP device activation modal and update resource catalog filters ([4b019c9](https://github.com/Velmar-Technology/msp_client_portal/commit/4b019c98976e073b646bd1308c96b5b187cec368))
* **devices:** add standalone OTP activation modal and downloadable resources catalog ([644480e](https://github.com/Velmar-Technology/msp_client_portal/commit/644480e4a64e4ebf69ac1aae5666fc890c4bdfbd))
* **plans:** allow soft delete of plans and filter inactive plans from plans page ([faa73ac](https://github.com/Velmar-Technology/msp_client_portal/commit/faa73acc5ffd981899aa160739ba95b6e17c1a9b))
* **terms:** update ToS contract page and sync database plan features ([26b88b6](https://github.com/Velmar-Technology/msp_client_portal/commit/26b88b60fc83b72df1f0d37ca6f367c261e887c5))
* **tickets:** refactor NewTicketModal to use AlertDialog and text-sm typography ([465cb67](https://github.com/Velmar-Technology/msp_client_portal/commit/465cb671c1cedba4bc41d6db6a221b16cbead1cd))
* **ui:** add column sorting support to DataTable, TicketsPage, and BillingPage ([2c1dafa](https://github.com/Velmar-Technology/msp_client_portal/commit/2c1dafaf01af0bd173ed1ee3771bf8f3235b1d79))


### Bug Fixes

* **billing:** include 18% tax in paypal subscription plan pricing to match checkout total ([0d13f9b](https://github.com/Velmar-Technology/msp_client_portal/commit/0d13f9be46e2d3aafeadbcb437d0b83ca6eb3f19))
* **ci:** pass VITE_PAYPAL_CLIENT_ID secret into production client build ([e93462b](https://github.com/Velmar-Technology/msp_client_portal/commit/e93462bc4a67c0da4ac749526df978a5fdf1797b))
* **client:** remove unused Send import from NewTicketModal ([b8c9a37](https://github.com/Velmar-Technology/msp_client_portal/commit/b8c9a374db59c7421e482fa1d2b14a65ef26ded6))
* **client:** resolve typescript build errors in input-otp, useTopNav, and vite.config ([6cc35fa](https://github.com/Velmar-Technology/msp_client_portal/commit/6cc35faab727143e46b512456018fa391e8abf46))
* **dashboard:** add online and storageError keys to i18n locales ([c7c3360](https://github.com/Velmar-Technology/msp_client_portal/commit/c7c33602a98002ea6dc70f9abd92029b5ee98b62))
* **paypal:** standardize js sdk intent mode and improve environment url resolution ([6a1f3a6](https://github.com/Velmar-Technology/msp_client_portal/commit/6a1f3a6ed35e7aebaf2e181f5d4bd130280fe6ce))

## [1.3.2](https://github.com/eapolancovelmar/msp_client_portal/compare/v1.3.1...v1.3.2) (2026-08-10)


### Features

* **billing:** add invoice cancellation, automatic navigation, and created_at sorting ([7d819f1](https://github.com/eapolancovelmar/msp_client_portal/commit/7d819f108ad6eb5be41232240e3f3ce3fdea630a))
* **billing:** add store discount, updated terms, and 3-day invoice due email notification rate-limiting ([ee7cc3d](https://github.com/eapolancovelmar/msp_client_portal/commit/ee7cc3d13de4fbe8fcc77719cf885cb9a70cd683))
* **tickets:** refactor NewTicketModal to use AlertDialog and text-sm typography ([465cb67](https://github.com/eapolancovelmar/msp_client_portal/commit/465cb671c1cedba4bc41d6db6a221b16cbead1cd))
* **ui:** add column sorting support to DataTable, TicketsPage, and BillingPage ([2c1dafa](https://github.com/eapolancovelmar/msp_client_portal/commit/2c1dafaf01af0bd173ed1ee3771bf8f3235b1d79))

## [1.3.1](https://github.com/eapolancovelmar/msp_client_portal/compare/v1.3.0...v1.3.1) (2026-08-05)


### Features

* **auth:** add whatsapp otp signup and phone number field to profile ([c8a0a93](https://github.com/eapolancovelmar/msp_client_portal/commit/c8a0a9322a9e88cb3717fffc5c3b028fc030c06c))
* **billing:** add admin mark as paid, plan activation, and invoice details modal ([afbf48c](https://github.com/eapolancovelmar/msp_client_portal/commit/afbf48c4c9f83d7c01fdffce1123916b384f1085))
* **billing:** show invoice line items in invoice details modal ([c8cf1ea](https://github.com/eapolancovelmar/msp_client_portal/commit/c8cf1ea04044bc6f245be1b65fc65c25fe7030f8))
* **plans:** allow soft delete of plans and filter inactive plans from plans page ([faa73ac](https://github.com/eapolancovelmar/msp_client_portal/commit/faa73acc5ffd981899aa160739ba95b6e17c1a9b))
* **terms:** update ToS contract page and sync database plan features ([26b88b6](https://github.com/eapolancovelmar/msp_client_portal/commit/26b88b60fc83b72df1f0d37ca6f367c261e887c5))


### Bug Fixes

* **client:** resolve typescript build errors in input-otp, useTopNav, and vite.config ([6cc35fa](https://github.com/eapolancovelmar/msp_client_portal/commit/6cc35faab727143e46b512456018fa391e8abf46))

## [1.3.0](https://github.com/eapolancovelmar/msp_client_portal/compare/v1.2.1...v1.3.0) (2026-08-04)


### Features

* **billing:** add bank accounts to checkout and handle bank transfer invoice flow with admin notifications ([03eb0c0](https://github.com/eapolancovelmar/msp_client_portal/commit/03eb0c07d5a43d9597f918e569b89b3c17820066))
* **ci:** add manual deploy trigger with version fallback ([fe87f2c](https://github.com/eapolancovelmar/msp_client_portal/commit/fe87f2c939ccdfc3e15ac474bc98fafe2c57414d))
* **devices:** add OTP device activation modal and update resource catalog filters ([4b019c9](https://github.com/eapolancovelmar/msp_client_portal/commit/4b019c98976e073b646bd1308c96b5b187cec368))
* **devices:** add standalone OTP activation modal and downloadable resources catalog ([644480e](https://github.com/eapolancovelmar/msp_client_portal/commit/644480e4a64e4ebf69ac1aae5666fc890c4bdfbd))


### Bug Fixes

* **billing:** include 18% tax in paypal subscription plan pricing to match checkout total ([0d13f9b](https://github.com/eapolancovelmar/msp_client_portal/commit/0d13f9be46e2d3aafeadbcb437d0b83ca6eb3f19))
* **ci:** pass VITE_PAYPAL_CLIENT_ID secret into production client build ([e93462b](https://github.com/eapolancovelmar/msp_client_portal/commit/e93462bc4a67c0da4ac749526df978a5fdf1797b))
* **dashboard:** add online and storageError keys to i18n locales ([c7c3360](https://github.com/eapolancovelmar/msp_client_portal/commit/c7c33602a98002ea6dc70f9abd92029b5ee98b62))
* **paypal:** standardize js sdk intent mode and improve environment url resolution ([6a1f3a6](https://github.com/eapolancovelmar/msp_client_portal/commit/6a1f3a6ed35e7aebaf2e181f5d4bd130280fe6ce))

## 1.2.1 (2026-08-03)


### Features

* add global search functionality in TopNav component ([9788438](https://github.com/Velmar-Technology/msp_client_portal/commit/9788438260abcedd39b3e8fb43561f5cc17c7abb))
* add invoicing management for admin dashboard ([d7f70e2](https://github.com/Velmar-Technology/msp_client_portal/commit/d7f70e2d45f70c2cc042f2978c4890852a331561))
* add multi-plan selection for clients ([a07c6fa](https://github.com/Velmar-Technology/msp_client_portal/commit/a07c6fa7039486f831ffd4bb6446fe20e81d2b5d))
* add notifications feature and preferences ([fc9fb01](https://github.com/Velmar-Technology/msp_client_portal/commit/fc9fb0109ec1038bc1cc26a242d1a63638c1641c))
* add skill for bussines logic helper ([f20d177](https://github.com/Velmar-Technology/msp_client_portal/commit/f20d177ad8b5426ca4935a36589e84277d24bb73))
* add support for attachments ([b4872fe](https://github.com/Velmar-Technology/msp_client_portal/commit/b4872fe7ac762e1e313a5fc33f63fb5c1d96df55))
* add support for last login data in profile page ([77d428d](https://github.com/Velmar-Technology/msp_client_portal/commit/77d428d5bd1b164105c1826b484019f977398740))
* add support for paypal checkout ([0253263](https://github.com/Velmar-Technology/msp_client_portal/commit/0253263c8005598f15819f7dc35f0e04076b9749))
* add support for responses on tickets ([e6b319a](https://github.com/Velmar-Technology/msp_client_portal/commit/e6b319aee3ac0028227b52ced773501cde99ddbf))
* add zustand store for state management ([0e86e0c](https://github.com/Velmar-Technology/msp_client_portal/commit/0e86e0c796d462d74b70fa5d2719000aef87b429))
* **admin:** add user management page for admin users ([6d0008b](https://github.com/Velmar-Technology/msp_client_portal/commit/6d0008b6d07c03429da8b8b14a80239d775fbe5e))
* agent ticketing assign system ([e9c688b](https://github.com/Velmar-Technology/msp_client_portal/commit/e9c688b5e3722831df4643b110b7a972a0077f77))
* allow change profile picture ([fa823ed](https://github.com/Velmar-Technology/msp_client_portal/commit/fa823eda3456fab13ed6950c2d5d3db1e0ee5023))
* **api:** add catch-all 404 middleware for unknown API routes ([d9e231f](https://github.com/Velmar-Technology/msp_client_portal/commit/d9e231ff8ba9b94c9400390d431f39bbfdde5d0e))
* **auth:** add language switcher on login page and fix viewport spacing ([4eb3432](https://github.com/Velmar-Technology/msp_client_portal/commit/4eb3432e372644dad42e325903e20c87b4a3b2eb))
* **auth:** add session expiry logout and remember me functionality ([cb72873](https://github.com/Velmar-Technology/msp_client_portal/commit/cb7287390690c9c866f5c507a0e76a1f8d247af4))
* **auth:** implement OTP verification, modern login UI, and global error handling ([3415f6a](https://github.com/Velmar-Technology/msp_client_portal/commit/3415f6aaf35873718e7d724a483541bfea60a284))
* **billing:** add invoice download capability with brand logo and i18n ([006bcce](https://github.com/Velmar-Technology/msp_client_portal/commit/006bcce8b89088ca09c1b3e726d88b425ce2d3de))
* **client:** implement notification preferences i18n and layout improvements ([9d04091](https://github.com/Velmar-Technology/msp_client_portal/commit/9d04091bac112dfc4679800269163abfa5617ae3))
* **db:** ensure at least one admin is created on database migration ([09046f7](https://github.com/Velmar-Technology/msp_client_portal/commit/09046f73fe0017b7bf70375cc07d2bae9da2d953))
* deploy in docker vps ([2dd5d9b](https://github.com/Velmar-Technology/msp_client_portal/commit/2dd5d9b573e93e187a5ed39e00e8a22add9f1db9))
* **deploy:** tag docker images and compose with release version ([827915d](https://github.com/Velmar-Technology/msp_client_portal/commit/827915db7c5b328c2756ac5ca7399147bf28ad9b))
* **devices:** add bulk operations for OTP generation, deactivation, and CSV export ([ab048ee](https://github.com/Velmar-Technology/msp_client_portal/commit/ab048eee9c06b8fae0bbdba00a6db0672a89142b))
* **devices:** implement i18n support in DevicesPage and fix test mock ([ee9d014](https://github.com/Velmar-Technology/msp_client_portal/commit/ee9d014a4743cd3b3ce46ad060564bce2d879c74))
* **devices:** move licensed devices and wizard to a dedicated Devices page ([48ab373](https://github.com/Velmar-Technology/msp_client_portal/commit/48ab373fcb74defe2fdccbb31ccd9ab081682287))
* **devices:** optimize device slot loading, memoize table rows, and restrict client OTP generation ([eb60a99](https://github.com/Velmar-Technology/msp_client_portal/commit/eb60a9976e1cc8f5b9bd94d833e2a8309f495050))
* **devices:** show nextcloud storage info in modal via actions menu ([0de1059](https://github.com/Velmar-Technology/msp_client_portal/commit/0de105905cccbf6d8ff993a7ffdfd83471bb6d92))
* **devices:** style page, add search, dropdown actions, skeletons, and sidebar restructuring ([e66442a](https://github.com/Velmar-Technology/msp_client_portal/commit/e66442a8ef5bdcb89beba327db290e0f96a481f1))
* **errors:** integrate @shared/errors across server and client with unified adapters and tests ([ef3175e](https://github.com/Velmar-Technology/msp_client_portal/commit/ef3175eef54a51057e210c775d089c3aec5c5dd0))
* **financials:** add log expense dialog, identifiers, pagination, and i18n ([f1c5a64](https://github.com/Velmar-Technology/msp_client_portal/commit/f1c5a64b691fe60c4deae0c755a12df1e84dd16b))
* **i18n:** centralize metadata and add slot revocation translations ([27de160](https://github.com/Velmar-Technology/msp_client_portal/commit/27de160948f1ad97e2fb6d65ed4f0818c5197db4))
* implement comprehensive subscription management system for plans, billing, and user access control ([9791175](https://github.com/Velmar-Technology/msp_client_portal/commit/9791175bc5af6bf20bf23e10e03b9b4d29de77f0))
* implement subscription management system with PayPal order integration and PlansPage UI ([d7697c9](https://github.com/Velmar-Technology/msp_client_portal/commit/d7697c93bf40473c1f48f757ed6e54b2572f1f45))
* implement subscription quotation mailing for client-side in plans interface ([5b3f77a](https://github.com/Velmar-Technology/msp_client_portal/commit/5b3f77a08b15234319f5d6384e9167fa9bd915dc))
* implement user profile password change functionality, and associated API endpoints ([30cad98](https://github.com/Velmar-Technology/msp_client_portal/commit/30cad985e28072e1630bc9a594bdb362bd2f61c6))
* integrate Google OAuth protocol for sign up/sign in. ([9dfdc0f](https://github.com/Velmar-Technology/msp_client_portal/commit/9dfdc0f6371c417a8d83d67a8a350f577f37b9d0))
* introduce drizzle orm to the app ([5eb13db](https://github.com/Velmar-Technology/msp_client_portal/commit/5eb13db20b0716151bad7607e071e9ae718f8c77))
* introduce multi-tenantcy in the whole app ([0b698df](https://github.com/Velmar-Technology/msp_client_portal/commit/0b698df9e5e0f427c14a81ce7c21e051d0cf8152))
* **maintenance,routing:** add device maintenance scheduling and localized 404 page ([2a0ea3b](https://github.com/Velmar-Technology/msp_client_portal/commit/2a0ea3bfa65c3599cdd8dc370a38505f43cbac9b))
* NextCloud api connection established ([7418894](https://github.com/Velmar-Technology/msp_client_portal/commit/74188944ba6761189d0b11b269fe575f3f9ba216))
* nextcloud provisioning successfully connected and verified ([8398e51](https://github.com/Velmar-Technology/msp_client_portal/commit/8398e515645f50f1d2513bf94aedab8ad1191bf3))
* **notification:** integrate sonner toasts, auto-reconnect sse, and fix tenant id ([8f3d35e](https://github.com/Velmar-Technology/msp_client_portal/commit/8f3d35e4e336ff0ea19f4719c987b9689a619334))
* **payments:** allow PAYPAL_API_URL override for the PayPal base URL ([12ba789](https://github.com/Velmar-Technology/msp_client_portal/commit/12ba7891bac6ca780f4351e33521d87a3a319fff))
* **plans:** add codification and parameters to plan features ([6805aa5](https://github.com/Velmar-Technology/msp_client_portal/commit/6805aa5ecf148d358280ae866d8e4abc94f7762b))
* **plans:** add i18n support for subscription dropdown actions ([38ef06b](https://github.com/Velmar-Technology/msp_client_portal/commit/38ef06b633a5624b95e644d065be9ccaa3c14114))
* **plans:** add i18n Tabs to the Features section of EditPlanModal ([47e1319](https://github.com/Velmar-Technology/msp_client_portal/commit/47e1319ad2d67a3d9f3434c3035ca3732c503abb))
* **plans:** add paypal checkout integration and sliding checkout sheet ([b9ebfe2](https://github.com/Velmar-Technology/msp_client_portal/commit/b9ebfe2fa71d12c3f34b6c451daabb13e99c9d5d))
* **plans:** allow editing and customizing feature parameters during plan edit ([e839eb0](https://github.com/Velmar-Technology/msp_client_portal/commit/e839eb0fb4ccb23738703b06ef4e6c068fe9b4f4))
* **plans:** conditional payment methods & layout bypass for legal/help pages ([756dbed](https://github.com/Velmar-Technology/msp_client_portal/commit/756dbed35c6adbb39f82d71dc3fa44d38858ef87))
* **plans:** convert subscription action button to dropdown menu ([c56bc8b](https://github.com/Velmar-Technology/msp_client_portal/commit/c56bc8b547584d011b857b5b51ca84c2c582f893))
* **plans:** implement full localization and translate user-facing text ([ccc4992](https://github.com/Velmar-Technology/msp_client_portal/commit/ccc49929ce9e9ffe58f1c35b79da61e151a0443b))
* **plans:** implement recurring paypal subscriptions and automatic renewal ([e18ef8f](https://github.com/Velmar-Technology/msp_client_portal/commit/e18ef8fc52383317d1a56aa6d187d5cc571bb130))
* **plans:** integrate shadcn tabs in CheckoutSheet ([8cf3af0](https://github.com/Velmar-Technology/msp_client_portal/commit/8cf3af00cafe3320960c667edcdbb400b7f9d626))
* **plans:** integrate Tabs component for i18n localization in EditPlanModal ([55445ad](https://github.com/Velmar-Technology/msp_client_portal/commit/55445adaa694aa5e8084313be9a23d87cd21b6cf))
* **subscriptions:** keep cancelled subscriptions active through period end to avoid partial refunds ([6daf8b3](https://github.com/Velmar-Technology/msp_client_portal/commit/6daf8b36bcccb5e75319caccff81163652b42c96))
* **tickets:** add device filter to client tickets view ([b6fcca7](https://github.com/Velmar-Technology/msp_client_portal/commit/b6fcca7ab6b3ce5c7294acd8c1ea16506dccf569))
* **tickets:** show device dropdown for expiring plans and harden modal loading ([76ca04c](https://github.com/Velmar-Technology/msp_client_portal/commit/76ca04c1a939c83c9f03cf24e537f155d5789130))
* **tos:** implement Dominican terms of service and checkout validation ([940e372](https://github.com/Velmar-Technology/msp_client_portal/commit/940e372f4718eb6375dd5a81ed2a6e513c483b71))
* **ui:** add i18n showingText to DataTable pagination ([453f22e](https://github.com/Velmar-Technology/msp_client_portal/commit/453f22ed3103e62b51d1be18e5295225cb98b679))
* **ui:** add settings quick-access popover to TopNav ([6c69e19](https://github.com/Velmar-Technology/msp_client_portal/commit/6c69e192fd923a0f2685c6c2e28858b225fc33cb))
* **ui:** add welcome dialog on signup success and refactor Terms page ([627f4d6](https://github.com/Velmar-Technology/msp_client_portal/commit/627f4d6911531a9097b7f435795048993edf6d60))
* **ui:** improve accessibility and consistency of icon-only buttons ([2dca552](https://github.com/Velmar-Technology/msp_client_portal/commit/2dca552a12f577e04cf53149ea5499220a7d8d68))
* **ui:** standardize datatable filtering, pagination, sorting, and design across all consumers ([a1f4b6a](https://github.com/Velmar-Technology/msp_client_portal/commit/a1f4b6a2a02f009c665f34970e40483795aef716))
* unified, centralized error-handling system inside the monorepo workspace ([d1dc90e](https://github.com/Velmar-Technology/msp_client_portal/commit/d1dc90e0ad273c5311469a0b86b6ff065b6bb9f4))
* **users:** allow admin to set client type and group bulk action modals ([974a266](https://github.com/Velmar-Technology/msp_client_portal/commit/974a26640bbbbb29f3b548e9e7e365c45aad408a))


### Bug Fixes

* **auth:** add missing otp fields to User type ([419e8ac](https://github.com/Velmar-Technology/msp_client_portal/commit/419e8ac1f866355dafb8db9beaa9636a25a9da62))
* **auth:** logout user when token is invalid or expired ([203c150](https://github.com/Velmar-Technology/msp_client_portal/commit/203c150f1637baea2ea70cb5b46841f4eeb5a568))
* **client:** resolve build errors in BillingPage, useAuth, and TicketDetailPage ([e45e8fa](https://github.com/Velmar-Technology/msp_client_portal/commit/e45e8faac0f93f4f5fa73602398a30ee90fd99e3))
* **client:** resolve client typescript compilation errors ([7912859](https://github.com/Velmar-Technology/msp_client_portal/commit/79128591eb9a3df1bc54ee387282dce35d4ec93e))
* **client:** resolve client typescript compilation errors and exclude tests from tsc build ([890d65f](https://github.com/Velmar-Technology/msp_client_portal/commit/890d65fa72d08f40a8ba9fc763fdc0da552cf8c3))
* **client:** resolve typescript unused variable and implicit any errors ([d5249e8](https://github.com/Velmar-Technology/msp_client_portal/commit/d5249e8022c42760f4907a979b5460a0d5d5daf9))
* db migration faults ([edca7f0](https://github.com/Velmar-Technology/msp_client_portal/commit/edca7f0a4621cb6d9cbf2d0c540ef21abd8cab98))
* **deploy:** add legacy-peer-deps to dockerfiles to resolve eresolve ([08e2c4c](https://github.com/Velmar-Technology/msp_client_portal/commit/08e2c4c0ae4c67e82db18db7498e2da87b1a6a19))
* **deploy:** explicitly install tailwind oxide gnu binary in client dockerfile ([c67eec6](https://github.com/Velmar-Technology/msp_client_portal/commit/c67eec628cb46558dfabccbdabf3ef13b28397ad))
* **deploy:** explicitly install zod in server production stage to resolve workspaces bug ([005ab55](https://github.com/Velmar-Technology/msp_client_portal/commit/005ab550292278199a6e8dad731afae775cbc06e))
* **deploy:** omit package-lock.json in builder stage to force dynamic binary resolution ([e7353e1](https://github.com/Velmar-Technology/msp_client_portal/commit/e7353e1432c19c4c13732ed1520338c888da07c3))
* **deploy:** restore package-lock.json and explicitly install lightningcss gnu binary ([780730c](https://github.com/Velmar-Technology/msp_client_portal/commit/780730c9a022b5cf1c03bb37bc658418e270f3ac))
* **deploy:** switch to node:22-slim base image to resolve lightningcss musl resolution error ([3dcf62a](https://github.com/Velmar-Technology/msp_client_portal/commit/3dcf62ac5e9ca402dda4a181991642daf37c9f79))
* **deploy:** use npm install in builder stage to fetch cross-platform binaries ([9c8ba61](https://github.com/Velmar-Technology/msp_client_portal/commit/9c8ba6129719ee792aaa3c9532d76211bab42c47))
* **deploy:** use npm install in server production stage to hoist peer dependencies ([7b494db](https://github.com/Velmar-Technology/msp_client_portal/commit/7b494db90512477fdce0fc27d811ec36ad286d48))
* **devices:** correct activation button label text in wizard ([ee0d32f](https://github.com/Velmar-Technology/msp_client_portal/commit/ee0d32f4400c4142fb418b2f8164852734dbf5f7))
* **devices:** enforce role restriction for OTP generation in EquipmentService ([31a91bb](https://github.com/Velmar-Technology/msp_client_portal/commit/31a91bb9f653aac4065e831f821dc2d60228ed8b))
* email settings ([ee44654](https://github.com/Velmar-Technology/msp_client_portal/commit/ee44654ae1076859c69cf8f47032f9a6fde73387))
* **financial:** remove unused React import to fix build failure ([d315982](https://github.com/Velmar-Technology/msp_client_portal/commit/d31598205fb5ca9052f3a706d78648df35e18d8f))
* ITBIS for quotation ([584d1a0](https://github.com/Velmar-Technology/msp_client_portal/commit/584d1a062158b483d37d8a76fa6ae41280fd1438))
* **maintenance:** allow cross-tenant scheduling for admin and filter target devices ([048697a](https://github.com/Velmar-Technology/msp_client_portal/commit/048697a9cb0f47793f899636f3e061ae3b3c8227))
* npm error on build the images ([5e2e04c](https://github.com/Velmar-Technology/msp_client_portal/commit/5e2e04c5255c4b1e76608738182c4625ad6167ab))
* **plans:** add drag handle title attribute in EditPlanModal ([cd237ab](https://github.com/Velmar-Technology/msp_client_portal/commit/cd237abaaa8b317192a11c8b733341f30aadb9ed))
* **plans:** interpolate parameters in feature catalog dropdown option labels ([edcd8f3](https://github.com/Velmar-Technology/msp_client_portal/commit/edcd8f344bd00e238ad00259860bd95462c23ecf))
* **plans:** restore placeholder and move button titles in EditPlanModal ([bf392bd](https://github.com/Velmar-Technology/msp_client_portal/commit/bf392bd9ef7922a9fa9dd89960e9d609c50fcdc6))
* **plans:** restore standard feature placeholder text in EditPlanModal ([0e2e60e](https://github.com/Velmar-Technology/msp_client_portal/commit/0e2e60e03a12282c753379d7851eb81a1347da61))
* **server:** remove duplicate fields in User interface ([649ab73](https://github.com/Velmar-Technology/msp_client_portal/commit/649ab73da6f70a4b79bc9d6890d4cee564835cc5))
* **server:** resolve typecheck and compilation errors in auth and equipment ([72ccc68](https://github.com/Velmar-Technology/msp_client_portal/commit/72ccc68043dd1b318a0a6bae81e5a73dbe11b489))
* **server:** standardize logging, clean up Nextcloud accounts on subscription changes, and enforce tenant scoping ([588616b](https://github.com/Velmar-Technology/msp_client_portal/commit/588616bf692088f084d4db0d6cbfa8a0094a8d7b))
* Shadcn installation fixed ([af0286b](https://github.com/Velmar-Technology/msp_client_portal/commit/af0286b08e7bb578f46ea65a675974a903e73cba))
* **ui:** improve grid layouts and rename sidebar profile group to account ([8dc690a](https://github.com/Velmar-Technology/msp_client_portal/commit/8dc690a405e53943b3878072bd4c7988e9770959))
* Uncaught SyntaxError: The requested module does not provide an export named 'ClientError' ([d2f75b9](https://github.com/Velmar-Technology/msp_client_portal/commit/d2f75b9a78686e4a4c900a4335730f5e6d3014d4))

## [1.2.0](https://github.com/eapolancovelmar/msp_client_portal/compare/v1.1.0...v1.2.0) (2026-08-03)


### Features

* **admin:** add user management page for admin users ([6d0008b](https://github.com/eapolancovelmar/msp_client_portal/commit/6d0008b6d07c03429da8b8b14a80239d775fbe5e))
* **auth:** add language switcher on login page and fix viewport spacing ([4eb3432](https://github.com/eapolancovelmar/msp_client_portal/commit/4eb3432e372644dad42e325903e20c87b4a3b2eb))
* **auth:** add session expiry logout and remember me functionality ([cb72873](https://github.com/eapolancovelmar/msp_client_portal/commit/cb7287390690c9c866f5c507a0e76a1f8d247af4))
* **auth:** implement OTP verification, modern login UI, and global error handling ([3415f6a](https://github.com/eapolancovelmar/msp_client_portal/commit/3415f6aaf35873718e7d724a483541bfea60a284))
* **billing:** add invoice download capability with brand logo and i18n ([006bcce](https://github.com/eapolancovelmar/msp_client_portal/commit/006bcce8b89088ca09c1b3e726d88b425ce2d3de))
* **client:** implement notification preferences i18n and layout improvements ([9d04091](https://github.com/eapolancovelmar/msp_client_portal/commit/9d04091bac112dfc4679800269163abfa5617ae3))
* **devices:** add bulk operations for OTP generation, deactivation, and CSV export ([ab048ee](https://github.com/eapolancovelmar/msp_client_portal/commit/ab048eee9c06b8fae0bbdba00a6db0672a89142b))
* **devices:** implement i18n support in DevicesPage and fix test mock ([ee9d014](https://github.com/eapolancovelmar/msp_client_portal/commit/ee9d014a4743cd3b3ce46ad060564bce2d879c74))
* **devices:** move licensed devices and wizard to a dedicated Devices page ([48ab373](https://github.com/eapolancovelmar/msp_client_portal/commit/48ab373fcb74defe2fdccbb31ccd9ab081682287))
* **devices:** optimize device slot loading, memoize table rows, and restrict client OTP generation ([eb60a99](https://github.com/eapolancovelmar/msp_client_portal/commit/eb60a9976e1cc8f5b9bd94d833e2a8309f495050))
* **devices:** show nextcloud storage info in modal via actions menu ([0de1059](https://github.com/eapolancovelmar/msp_client_portal/commit/0de105905cccbf6d8ff993a7ffdfd83471bb6d92))
* **devices:** style page, add search, dropdown actions, skeletons, and sidebar restructuring ([e66442a](https://github.com/eapolancovelmar/msp_client_portal/commit/e66442a8ef5bdcb89beba327db290e0f96a481f1))
* **financials:** add log expense dialog, identifiers, pagination, and i18n ([f1c5a64](https://github.com/eapolancovelmar/msp_client_portal/commit/f1c5a64b691fe60c4deae0c755a12df1e84dd16b))
* **i18n:** centralize metadata and add slot revocation translations ([27de160](https://github.com/eapolancovelmar/msp_client_portal/commit/27de160948f1ad97e2fb6d65ed4f0818c5197db4))
* implement subscription management system with PayPal order integration and PlansPage UI ([d7697c9](https://github.com/eapolancovelmar/msp_client_portal/commit/d7697c93bf40473c1f48f757ed6e54b2572f1f45))
* **maintenance,routing:** add device maintenance scheduling and localized 404 page ([2a0ea3b](https://github.com/eapolancovelmar/msp_client_portal/commit/2a0ea3bfa65c3599cdd8dc370a38505f43cbac9b))
* **notification:** integrate sonner toasts, auto-reconnect sse, and fix tenant id ([8f3d35e](https://github.com/eapolancovelmar/msp_client_portal/commit/8f3d35e4e336ff0ea19f4719c987b9689a619334))
* **payments:** allow PAYPAL_API_URL override for the PayPal base URL ([12ba789](https://github.com/eapolancovelmar/msp_client_portal/commit/12ba7891bac6ca780f4351e33521d87a3a319fff))
* **plans:** add codification and parameters to plan features ([6805aa5](https://github.com/eapolancovelmar/msp_client_portal/commit/6805aa5ecf148d358280ae866d8e4abc94f7762b))
* **plans:** add i18n support for subscription dropdown actions ([38ef06b](https://github.com/eapolancovelmar/msp_client_portal/commit/38ef06b633a5624b95e644d065be9ccaa3c14114))
* **plans:** add i18n Tabs to the Features section of EditPlanModal ([47e1319](https://github.com/eapolancovelmar/msp_client_portal/commit/47e1319ad2d67a3d9f3434c3035ca3732c503abb))
* **plans:** allow editing and customizing feature parameters during plan edit ([e839eb0](https://github.com/eapolancovelmar/msp_client_portal/commit/e839eb0fb4ccb23738703b06ef4e6c068fe9b4f4))
* **plans:** conditional payment methods & layout bypass for legal/help pages ([756dbed](https://github.com/eapolancovelmar/msp_client_portal/commit/756dbed35c6adbb39f82d71dc3fa44d38858ef87))
* **plans:** convert subscription action button to dropdown menu ([c56bc8b](https://github.com/eapolancovelmar/msp_client_portal/commit/c56bc8b547584d011b857b5b51ca84c2c582f893))
* **plans:** implement full localization and translate user-facing text ([ccc4992](https://github.com/eapolancovelmar/msp_client_portal/commit/ccc49929ce9e9ffe58f1c35b79da61e151a0443b))
* **plans:** implement recurring paypal subscriptions and automatic renewal ([e18ef8f](https://github.com/eapolancovelmar/msp_client_portal/commit/e18ef8fc52383317d1a56aa6d187d5cc571bb130))
* **plans:** integrate shadcn tabs in CheckoutSheet ([8cf3af0](https://github.com/eapolancovelmar/msp_client_portal/commit/8cf3af00cafe3320960c667edcdbb400b7f9d626))
* **plans:** integrate Tabs component for i18n localization in EditPlanModal ([55445ad](https://github.com/eapolancovelmar/msp_client_portal/commit/55445adaa694aa5e8084313be9a23d87cd21b6cf))
* **subscriptions:** keep cancelled subscriptions active through period end to avoid partial refunds ([6daf8b3](https://github.com/eapolancovelmar/msp_client_portal/commit/6daf8b36bcccb5e75319caccff81163652b42c96))
* **tickets:** add device filter to client tickets view ([b6fcca7](https://github.com/eapolancovelmar/msp_client_portal/commit/b6fcca7ab6b3ce5c7294acd8c1ea16506dccf569))
* **tickets:** show device dropdown for expiring plans and harden modal loading ([76ca04c](https://github.com/eapolancovelmar/msp_client_portal/commit/76ca04c1a939c83c9f03cf24e537f155d5789130))
* **tos:** implement Dominican terms of service and checkout validation ([940e372](https://github.com/eapolancovelmar/msp_client_portal/commit/940e372f4718eb6375dd5a81ed2a6e513c483b71))
* **ui:** add i18n showingText to DataTable pagination ([453f22e](https://github.com/eapolancovelmar/msp_client_portal/commit/453f22ed3103e62b51d1be18e5295225cb98b679))
* **ui:** add settings quick-access popover to TopNav ([6c69e19](https://github.com/eapolancovelmar/msp_client_portal/commit/6c69e192fd923a0f2685c6c2e28858b225fc33cb))
* **ui:** add welcome dialog on signup success and refactor Terms page ([627f4d6](https://github.com/eapolancovelmar/msp_client_portal/commit/627f4d6911531a9097b7f435795048993edf6d60))
* **ui:** improve accessibility and consistency of icon-only buttons ([2dca552](https://github.com/eapolancovelmar/msp_client_portal/commit/2dca552a12f577e04cf53149ea5499220a7d8d68))
* **ui:** standardize datatable filtering, pagination, sorting, and design across all consumers ([a1f4b6a](https://github.com/eapolancovelmar/msp_client_portal/commit/a1f4b6a2a02f009c665f34970e40483795aef716))
* **users:** allow admin to set client type and group bulk action modals ([974a266](https://github.com/eapolancovelmar/msp_client_portal/commit/974a26640bbbbb29f3b548e9e7e365c45aad408a))


### Bug Fixes

* **auth:** add missing otp fields to User type ([419e8ac](https://github.com/eapolancovelmar/msp_client_portal/commit/419e8ac1f866355dafb8db9beaa9636a25a9da62))
* **auth:** logout user when token is invalid or expired ([203c150](https://github.com/eapolancovelmar/msp_client_portal/commit/203c150f1637baea2ea70cb5b46841f4eeb5a568))
* **client:** resolve build errors in BillingPage, useAuth, and TicketDetailPage ([e45e8fa](https://github.com/eapolancovelmar/msp_client_portal/commit/e45e8faac0f93f4f5fa73602398a30ee90fd99e3))
* **client:** resolve client typescript compilation errors ([7912859](https://github.com/eapolancovelmar/msp_client_portal/commit/79128591eb9a3df1bc54ee387282dce35d4ec93e))
* **client:** resolve typescript unused variable and implicit any errors ([d5249e8](https://github.com/eapolancovelmar/msp_client_portal/commit/d5249e8022c42760f4907a979b5460a0d5d5daf9))
* **devices:** correct activation button label text in wizard ([ee0d32f](https://github.com/eapolancovelmar/msp_client_portal/commit/ee0d32f4400c4142fb418b2f8164852734dbf5f7))
* **devices:** enforce role restriction for OTP generation in EquipmentService ([31a91bb](https://github.com/eapolancovelmar/msp_client_portal/commit/31a91bb9f653aac4065e831f821dc2d60228ed8b))
* **financial:** remove unused React import to fix build failure ([d315982](https://github.com/eapolancovelmar/msp_client_portal/commit/d31598205fb5ca9052f3a706d78648df35e18d8f))
* **maintenance:** allow cross-tenant scheduling for admin and filter target devices ([048697a](https://github.com/eapolancovelmar/msp_client_portal/commit/048697a9cb0f47793f899636f3e061ae3b3c8227))
* **plans:** add drag handle title attribute in EditPlanModal ([cd237ab](https://github.com/eapolancovelmar/msp_client_portal/commit/cd237abaaa8b317192a11c8b733341f30aadb9ed))
* **plans:** interpolate parameters in feature catalog dropdown option labels ([edcd8f3](https://github.com/eapolancovelmar/msp_client_portal/commit/edcd8f344bd00e238ad00259860bd95462c23ecf))
* **plans:** restore placeholder and move button titles in EditPlanModal ([bf392bd](https://github.com/eapolancovelmar/msp_client_portal/commit/bf392bd9ef7922a9fa9dd89960e9d609c50fcdc6))
* **plans:** restore standard feature placeholder text in EditPlanModal ([0e2e60e](https://github.com/eapolancovelmar/msp_client_portal/commit/0e2e60e03a12282c753379d7851eb81a1347da61))
* **server:** remove duplicate fields in User interface ([649ab73](https://github.com/eapolancovelmar/msp_client_portal/commit/649ab73da6f70a4b79bc9d6890d4cee564835cc5))
* **server:** resolve typecheck and compilation errors in auth and equipment ([72ccc68](https://github.com/eapolancovelmar/msp_client_portal/commit/72ccc68043dd1b318a0a6bae81e5a73dbe11b489))
* **server:** standardize logging, clean up Nextcloud accounts on subscription changes, and enforce tenant scoping ([588616b](https://github.com/eapolancovelmar/msp_client_portal/commit/588616bf692088f084d4db0d6cbfa8a0094a8d7b))
* **ui:** improve grid layouts and rename sidebar profile group to account ([8dc690a](https://github.com/eapolancovelmar/msp_client_portal/commit/8dc690a405e53943b3878072bd4c7988e9770959))

## 1.1.0 (2026-06-30)


### Features

* add global search functionality in TopNav component ([9788438](https://github.com/eapolancovelmar/msp_client_portal/commit/9788438260abcedd39b3e8fb43561f5cc17c7abb))
* add invoicing management for admin dashboard ([d7f70e2](https://github.com/eapolancovelmar/msp_client_portal/commit/d7f70e2d45f70c2cc042f2978c4890852a331561))
* add multi-plan selection for clients ([a07c6fa](https://github.com/eapolancovelmar/msp_client_portal/commit/a07c6fa7039486f831ffd4bb6446fe20e81d2b5d))
* add notifications feature and preferences ([fc9fb01](https://github.com/eapolancovelmar/msp_client_portal/commit/fc9fb0109ec1038bc1cc26a242d1a63638c1641c))
* add skill for bussines logic helper ([f20d177](https://github.com/eapolancovelmar/msp_client_portal/commit/f20d177ad8b5426ca4935a36589e84277d24bb73))
* add support for attachments ([b4872fe](https://github.com/eapolancovelmar/msp_client_portal/commit/b4872fe7ac762e1e313a5fc33f63fb5c1d96df55))
* add support for last login data in profile page ([77d428d](https://github.com/eapolancovelmar/msp_client_portal/commit/77d428d5bd1b164105c1826b484019f977398740))
* add support for paypal checkout ([0253263](https://github.com/eapolancovelmar/msp_client_portal/commit/0253263c8005598f15819f7dc35f0e04076b9749))
* add support for responses on tickets ([e6b319a](https://github.com/eapolancovelmar/msp_client_portal/commit/e6b319aee3ac0028227b52ced773501cde99ddbf))
* add zustand store for state management ([0e86e0c](https://github.com/eapolancovelmar/msp_client_portal/commit/0e86e0c796d462d74b70fa5d2719000aef87b429))
* agent ticketing assign system ([e9c688b](https://github.com/eapolancovelmar/msp_client_portal/commit/e9c688b5e3722831df4643b110b7a972a0077f77))
* allow change profile picture ([fa823ed](https://github.com/eapolancovelmar/msp_client_portal/commit/fa823eda3456fab13ed6950c2d5d3db1e0ee5023))
* **api:** add catch-all 404 middleware for unknown API routes ([d9e231f](https://github.com/eapolancovelmar/msp_client_portal/commit/d9e231ff8ba9b94c9400390d431f39bbfdde5d0e))
* **db:** ensure at least one admin is created on database migration ([09046f7](https://github.com/eapolancovelmar/msp_client_portal/commit/09046f73fe0017b7bf70375cc07d2bae9da2d953))
* deploy in docker vps ([2dd5d9b](https://github.com/eapolancovelmar/msp_client_portal/commit/2dd5d9b573e93e187a5ed39e00e8a22add9f1db9))
* **errors:** integrate @shared/errors across server and client with unified adapters and tests ([ef3175e](https://github.com/eapolancovelmar/msp_client_portal/commit/ef3175eef54a51057e210c775d089c3aec5c5dd0))
* implement comprehensive subscription management system for plans, billing, and user access control ([9791175](https://github.com/eapolancovelmar/msp_client_portal/commit/9791175bc5af6bf20bf23e10e03b9b4d29de77f0))
* implement subscription quotation mailing for client-side in plans interface ([5b3f77a](https://github.com/eapolancovelmar/msp_client_portal/commit/5b3f77a08b15234319f5d6384e9167fa9bd915dc))
* implement user profile password change functionality, and associated API endpoints ([30cad98](https://github.com/eapolancovelmar/msp_client_portal/commit/30cad985e28072e1630bc9a594bdb362bd2f61c6))
* integrate Google OAuth protocol for sign up/sign in. ([9dfdc0f](https://github.com/eapolancovelmar/msp_client_portal/commit/9dfdc0f6371c417a8d83d67a8a350f577f37b9d0))
* introduce drizzle orm to the app ([5eb13db](https://github.com/eapolancovelmar/msp_client_portal/commit/5eb13db20b0716151bad7607e071e9ae718f8c77))
* introduce multi-tenantcy in the whole app ([0b698df](https://github.com/eapolancovelmar/msp_client_portal/commit/0b698df9e5e0f427c14a81ce7c21e051d0cf8152))
* NextCloud api connection established ([7418894](https://github.com/eapolancovelmar/msp_client_portal/commit/74188944ba6761189d0b11b269fe575f3f9ba216))
* nextcloud provisioning successfully connected and verified ([8398e51](https://github.com/eapolancovelmar/msp_client_portal/commit/8398e515645f50f1d2513bf94aedab8ad1191bf3))
* **plans:** add paypal checkout integration and sliding checkout sheet ([b9ebfe2](https://github.com/eapolancovelmar/msp_client_portal/commit/b9ebfe2fa71d12c3f34b6c451daabb13e99c9d5d))
* unified, centralized error-handling system inside the monorepo workspace ([d1dc90e](https://github.com/eapolancovelmar/msp_client_portal/commit/d1dc90e0ad273c5311469a0b86b6ff065b6bb9f4))


### Bug Fixes

* **client:** resolve client typescript compilation errors and exclude tests from tsc build ([890d65f](https://github.com/eapolancovelmar/msp_client_portal/commit/890d65fa72d08f40a8ba9fc763fdc0da552cf8c3))
* db migration faults ([edca7f0](https://github.com/eapolancovelmar/msp_client_portal/commit/edca7f0a4621cb6d9cbf2d0c540ef21abd8cab98))
* **deploy:** add legacy-peer-deps to dockerfiles to resolve eresolve ([08e2c4c](https://github.com/eapolancovelmar/msp_client_portal/commit/08e2c4c0ae4c67e82db18db7498e2da87b1a6a19))
* **deploy:** explicitly install tailwind oxide gnu binary in client dockerfile ([c67eec6](https://github.com/eapolancovelmar/msp_client_portal/commit/c67eec628cb46558dfabccbdabf3ef13b28397ad))
* **deploy:** explicitly install zod in server production stage to resolve workspaces bug ([005ab55](https://github.com/eapolancovelmar/msp_client_portal/commit/005ab550292278199a6e8dad731afae775cbc06e))
* **deploy:** omit package-lock.json in builder stage to force dynamic binary resolution ([e7353e1](https://github.com/eapolancovelmar/msp_client_portal/commit/e7353e1432c19c4c13732ed1520338c888da07c3))
* **deploy:** restore package-lock.json and explicitly install lightningcss gnu binary ([780730c](https://github.com/eapolancovelmar/msp_client_portal/commit/780730c9a022b5cf1c03bb37bc658418e270f3ac))
* **deploy:** switch to node:22-slim base image to resolve lightningcss musl resolution error ([3dcf62a](https://github.com/eapolancovelmar/msp_client_portal/commit/3dcf62ac5e9ca402dda4a181991642daf37c9f79))
* **deploy:** use npm install in builder stage to fetch cross-platform binaries ([9c8ba61](https://github.com/eapolancovelmar/msp_client_portal/commit/9c8ba6129719ee792aaa3c9532d76211bab42c47))
* **deploy:** use npm install in server production stage to hoist peer dependencies ([7b494db](https://github.com/eapolancovelmar/msp_client_portal/commit/7b494db90512477fdce0fc27d811ec36ad286d48))
* email settings ([ee44654](https://github.com/eapolancovelmar/msp_client_portal/commit/ee44654ae1076859c69cf8f47032f9a6fde73387))
* ITBIS for quotation ([584d1a0](https://github.com/eapolancovelmar/msp_client_portal/commit/584d1a062158b483d37d8a76fa6ae41280fd1438))
* npm error on build the images ([5e2e04c](https://github.com/eapolancovelmar/msp_client_portal/commit/5e2e04c5255c4b1e76608738182c4625ad6167ab))
* Shadcn installation fixed ([af0286b](https://github.com/eapolancovelmar/msp_client_portal/commit/af0286b08e7bb578f46ea65a675974a903e73cba))
* Uncaught SyntaxError: The requested module does not provide an export named 'ClientError' ([d2f75b9](https://github.com/eapolancovelmar/msp_client_portal/commit/d2f75b9a78686e4a4c900a4335730f5e6d3014d4))
