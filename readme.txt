=== SourceSay ===
Contributors: swiftwebdev
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

== Installation ==

1. Install and activate WooCommerce.
2. Upload the plugin or install it from the Plugins screen, then activate it.
3. Go to WooCommerce > SourceSay to adjust the question and answers.

== Frequently Asked Questions ==

= Where does the survey appear? =

On the order confirmation page, before or after the order details. It can also appear on My Account > View order for 30 days if the customer has not answered yet.

= Does it slow down my checkout? =

No. The survey is shown after the order is placed, and its small script and stylesheet load only on the order confirmation and view-order pages.

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

== Privacy ==

SourceSay stores the customer's answer, the optional follow-up and "Other" text, the order total, currency, status, whether the customer ordered before, and the WooCommerce tracked source. All data stays in your own WordPress database. No data is sent to external servers, no external scripts, fonts or images are loaded, and there is no tracking. The plugin integrates with the WordPress personal data export and erase tools: erasing blanks the free text and unlinks the customer account. You can also set an automatic retention period in Settings.

== Changelog ==

= 1.0.0 =
* Initial release.
