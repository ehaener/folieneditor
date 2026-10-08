<?php
/**
 * Plugin Name:       Folieneditor für WooCommerce
 * Description:       Kunden gestalten Treppenfolien direkt auf der Produktseite (Größe, Text, Logo, Schrift, Farben). Der Preis wird aus den Maßen berechnet, das Druck-PDF hängt an der Bestellung.
 * Version:           1.0.0
 * Requires at least: 6.5
 * Requires PHP:      7.4
 * Author:            ehaener
 * License:           GPL-2.0-or-later
 * Text Domain:       folieneditor
 * WC requires at least: 8.0
 * WC tested up to:   11.1
 */

defined( 'ABSPATH' ) || exit;

define( 'FOLIENEDITOR_VERSION', '1.0.0' );
define( 'FOLIENEDITOR_FILE', __FILE__ );
define( 'FOLIENEDITOR_DIR', plugin_dir_path( __FILE__ ) );
define( 'FOLIENEDITOR_URL', plugin_dir_url( __FILE__ ) );

// Kompatibel mit den neuen Bestelltabellen (HPOS) und dem Warenkorb-/Kassen-Block
add_action( 'before_woocommerce_init', function () {
	if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
		\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', FOLIENEDITOR_FILE, true );
		\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'cart_checkout_blocks', FOLIENEDITOR_FILE, true );
	}
} );

add_action( 'plugins_loaded', function () {
	if ( ! class_exists( 'WooCommerce' ) ) {
		add_action( 'admin_notices', function () {
			echo '<div class="notice notice-error"><p><strong>Folieneditor:</strong> Bitte zuerst WooCommerce installieren und aktivieren.</p></div>';
		} );
		return;
	}
	require_once FOLIENEDITOR_DIR . 'includes/settings.php';
	require_once FOLIENEDITOR_DIR . 'includes/files.php';
	require_once FOLIENEDITOR_DIR . 'includes/product.php';
	require_once FOLIENEDITOR_DIR . 'includes/cart.php';
	require_once FOLIENEDITOR_DIR . 'includes/order.php';
} );

// Tägliches Aufräumen von Druckdateien, die nie bestellt wurden
register_activation_hook( __FILE__, function () {
	if ( ! wp_next_scheduled( 'folieneditor_cleanup' ) ) {
		wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', 'folieneditor_cleanup' );
	}
} );
register_deactivation_hook( __FILE__, function () {
	wp_clear_scheduled_hook( 'folieneditor_cleanup' );
} );
