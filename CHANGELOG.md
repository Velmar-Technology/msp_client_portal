# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

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
