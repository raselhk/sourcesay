=== SourceSay ===
Contributors: raselhk
Tags: woocommerce, attribution, survey, marketing, analytics
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 7.4
Requires Plugins: woocommerce
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Ask customers how they found you right after checkout and see which channels bring revenue.

== Description ==

Analytics tools can only track clicks. They miss podcasts, word of mouth, influencers, and the share of traffic that shows up as "direct". SourceSay asks the one question that fills the gap: **How did you hear about us?**

The survey appears on the order confirmation page (and, optionally, on the order page in My Account). Every answer is stored with the order total, so the report shows revenue per channel, not just a count of votes.

**Features**

* One-tap survey on the thank-you page, works with classic checkout and the Checkout block.
* Editable question, answer options, icons, order and follow-up questions ("Which podcast?").
* Starter option sets for general stores, fashion, B2B and local businesses.
* Reports: responses, response rate, revenue and average order value per channel, daily trend, new versus returning customers, top follow-up answers and latest "Other" answers.
* Compares what customers say with what WooCommerce Order Attribution tracked.
* Revenue stays live: refunds and status changes update the stored order total.
* Orders list column and filter, plus a box on the order screen.
* CSV export, safe against spreadsheet formula injection.
* Works without JavaScript, includes a honeypot and rate limiting.
* HPOS (high-performance order storage) compatible.
* Personal data exporter and eraser, optional automatic data retention.
* Shortcode `[sourcesay]` and a "SourceSay survey" block for custom thank-you pages (FunnelKit, CartFlows, Elementor, Bricks).
* "Prefer not to say" button. Skips are counted but never mixed into your answers or revenue.
* New customers only: skip the survey for people who ordered before.
* Reports compare with the previous period of the same length.
* Dashboard widget with your top five channels from the last 30 days.
* Private order note ("Customer said: Instagram"), orders list search by answer, and a "How they found you" section on customer profiles.
* Multi-currency stores: revenue is reported in your store currency (Aelia, WooPayments Multi-Currency, CURCY and WPML/WooCommerce Multilingual rates are used when present).
* WPML and Polylang: question, answers, follow-ups and thank-you text can be translated.

== Installation ==

1. Install and activate WooCommerce.
2. Upload the plugin or install it from the Plugins screen, then activate it.
3. Go to WooCommerce > SourceSay to adjust the question and answers.

== Frequently Asked Questions ==

= Where does the survey appear? =

On the order confirmation page, before or after the order details. It can also appear on My Account > View order for 30 days if the customer has not answered yet.

= Does it slow down my checkout? =

No. The survey is shown after the order is placed, and its small script and stylesheet load only on the order confirmation and view-order pages.

= My store uses FunnelKit or CartFlows. How do I show the survey? =

Those plugins replace the WooCommerce thank-you page, so add the "SourceSay survey" block (or the `[sourcesay]` shortcode) to your funnel's thank-you step. SourceSay reads the order from the page address (`order_id`, `order`, `wcf-order` and `key`, `order_key`, `wcf-key`), and the order key must match. Set Placement to "Only where I add the block or shortcode" on the Survey tab if you do not want the automatic placement as well. The survey is shown only once per page.

= Can customers skip the question? =

Yes, by default. A "Prefer not to say" button saves a skip so the survey is not shown again. Skips appear as a separate number in the report and never count as answers. Turn it off, or change the button text, on the Survey tab.

= Can I ask only new customers? =

Yes. Set Audience to "New customers only". Customers who already had a paid order are not asked. Test orders always show the survey.

= Where is the dashboard widget? =

On the WordPress Dashboard for users who can manage WooCommerce. It shows the last 30 days: response rate and revenue from answered orders with the change from the 30 days before, where answers come from, and your top five channels by revenue.

= Do I see the answer in order emails? =

Yes, in emails sent to you after the customer answered, and always as a private note on the order. The "New order" email is sent before the customer reaches the thank-you page, so it cannot contain the answer. Open the order or the note to see it.

= How do I search orders by answer? =

On the orders screen choose "How they found you" in the search dropdown (WooCommerce high-performance order storage), or just search on stores that use the classic orders screen.

= Does it work with multi-currency or translation plugins? =

Yes. Orders paid in another currency are converted to your store currency using the rate saved by Aelia, WooPayments Multi-Currency, CURCY or WPML when it exists (developers can use the `sourcesay_order_total_base` filter). With WPML or Polylang, translate SourceSay strings under String Translation (WPML) or Languages > Translations (Polylang), group "SourceSay".

= Can customers answer twice? =

No. Each order has at most one answer.

= Does it work with the Checkout block? =

Yes. It uses the standard order confirmation hook, which both classic and block checkout fire.

= Can I change the answer options? =

Yes. Add, remove, reorder and rename options, pick icons, and add follow-up questions on the Survey tab.

= How do I export the data? =

Use the Export CSV button on the Reports tab.

= What happens when I uninstall? =

Nothing is deleted unless you turn on "Delete all data on uninstall" in Settings.

== Screenshots ==

1. Reports: See at a glance how many customers answered, your response rate and which channels bring the most revenue.
2. Reports: Compare every channel's share of answers with its share of revenue, and follow answers day by day.
3. What your customer sees: The question on the order confirmation page, with an optional follow-up like "Which podcast?".
4. Survey: Edit the question and answers, and watch the live preview update as you type.
5. First-run setup: Check your question and answers in a quick guided step before turning the survey on.
6. WooCommerce Orders list: Every order shows what the customer said and the source WooCommerce tracked, with brand logos.
7. Dashboard widget: Response rate and revenue with the change from the previous 30 days, where answers come from, and your top five channels with their logos.
8. Settings: Ask again in My Account, choose how long answers are kept, and see exactly what is stored.

== Privacy ==

SourceSay stores the customer's answer, the optional follow-up and "Other" text, the order total, currency, status, whether the customer ordered before, and the WooCommerce tracked source. All data stays in your own WordPress database. No data is sent to external servers, no external scripts, fonts or images are loaded, and there is no tracking. The plugin integrates with the WordPress personal data export and erase tools: erasing blanks the free text and unlinks the customer account. You can also set an automatic retention period in Settings.

== Changelog ==

= 1.0.0 =
* Initial release, including the shortcode and block, skip button, new-customers-only audience, previous-period comparison, dashboard widget, order notes and search, multi-currency totals and WPML/Polylang support.
