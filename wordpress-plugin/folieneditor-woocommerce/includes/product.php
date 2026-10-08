<?php
// Produktseite: Schalter im Produkt, Editor anzeigen, Shortcode [folieneditor],
// normalen Warenkorb-Knopf ersetzen, Preis als "ab …" anzeigen.

defined( 'ABSPATH' ) || exit;

function folieneditor_enabled( $product ): bool {
	$product = $product instanceof WC_Product ? $product : wc_get_product( $product );
	return $product && $product->is_type( 'simple' ) && 'yes' === $product->get_meta( '_folieneditor_enabled' );
}

// ---- Schalter im Backend (Produkt bearbeiten → Allgemein) ----
add_action( 'woocommerce_product_options_general_product_data', function () {
	echo '<div class="options_group show_if_simple">';
	woocommerce_wp_checkbox( [
		'id'          => '_folieneditor_enabled',
		'label'       => 'Folieneditor',
		'description' => 'Kunden gestalten dieses Produkt im Editor. Der Preis wird aus den Maßen berechnet (WooCommerce → Einstellungen → Produkte → Folieneditor). Den regulären Preis oben trotzdem ausfüllen, z. B. mit dem Mindestpreis.',
	] );
	echo '</div>';
} );

add_action( 'woocommerce_admin_process_product_object', function ( $product ) {
	$product->update_meta_data( '_folieneditor_enabled', isset( $_POST['_folieneditor_enabled'] ) ? 'yes' : 'no' ); // phpcs:ignore WordPress.Security.NonceVerification
} );

// ---- Editor ausgeben ----
function folieneditor_enqueue(): void {
	wp_enqueue_style( 'folieneditor', FOLIENEDITOR_URL . 'editor/styles.css', [], FOLIENEDITOR_VERSION );
	wp_add_inline_style( 'folieneditor', 'body.folieneditor-product form.cart{display:none!important}' );
	wp_enqueue_script_module( 'folieneditor-shop', FOLIENEDITOR_URL . 'editor/src/shop.js', [], FOLIENEDITOR_VERSION );
}

function folieneditor_render( $product ): string {
	$product = $product instanceof WC_Product ? $product : wc_get_product( $product );
	if ( ! $product || ! folieneditor_enabled( $product ) ) {
		return '';
	}
	folieneditor_enqueue();
	$s   = folieneditor_settings();
	$cfg = [
		'productId' => $product->get_id(),
		'action'    => $product->get_permalink(),
		'currency'  => get_woocommerce_currency(),
		'taxNote'   => ( wc_prices_include_tax() ? 'inkl. MwSt.' : 'zzgl. MwSt.' ) . ', zzgl. Versandkosten',
		'price'     => [ 'base' => $s['base'], 'perM2' => $s['per_m2'], 'min' => $s['min'] ],
		'limits'    => [ 'minW' => $s['min_w'], 'maxW' => $s['max_w'], 'minH' => $s['min_h'], 'maxH' => $s['max_h'] ],
		'maxUpload' => folieneditor_max_upload(),
	];
	return '<div id="folieneditor" class="fe-shop alignwide" data-folieneditor="' . esc_attr( wp_json_encode( $cfg ) ) . '">'
		. '<noscript>Für den Folieneditor bitte JavaScript aktivieren.</noscript></div>';
}

// Shortcode für beliebige Seiten oder die Produktbeschreibung: [folieneditor] oder [folieneditor product="123"]
add_shortcode( 'folieneditor', function ( $atts ) {
	$atts = shortcode_atts( [ 'product' => 0 ], $atts, 'folieneditor' );
	$id   = (int) $atts['product'] ?: get_the_ID();
	if ( ! folieneditor_enabled( $id ) ) {
		return current_user_can( 'edit_products' ) ? '<p><em>Folieneditor: Bei diesem Produkt ist der Editor nicht eingeschaltet.</em></p>' : '';
	}
	$GLOBALS['folieneditor_rendered'] = true;
	return folieneditor_render( $id );
} );

// Automatisch auf der Produktseite: unter der Produktzusammenfassung, volle Breite
add_action( 'wp', function () {
	if ( ! is_product() || ! folieneditor_enabled( get_queried_object_id() ) ) {
		return;
	}
	add_filter( 'body_class', fn( $c ) => array_merge( $c, [ 'folieneditor-product' ] ) );
	add_action( 'wp_enqueue_scripts', 'folieneditor_enqueue' );
	add_action( 'woocommerce_single_product_summary', function () {
		echo '<p><a class="button alt" href="#folieneditor">Jetzt gestalten</a></p>';
	}, 30 );
	$render = function () {
		if ( ! empty( $GLOBALS['folieneditor_rendered'] ) || has_shortcode( (string) get_post_field( 'post_content', get_queried_object_id() ), 'folieneditor' ) ) {
			return '';
		}
		$GLOBALS['folieneditor_rendered'] = true;
		return folieneditor_render( get_queried_object_id() );
	};
	if ( wp_is_block_theme() ) {
		// Block-Themes: direkt vor dem Block mit den Reitern (Beschreibung, Bewertungen)
		add_filter( 'render_block_woocommerce/product-details', function ( $html ) use ( $render ) {
			return $render() . $html;
		} );
	} else {
		// Klassische Themes: zwischen Produktzusammenfassung und Reitern
		add_action( 'woocommerce_after_single_product_summary', function () use ( $render ) {
			echo $render(); // phpcs:ignore WordPress.Security.EscapeOutput
		}, 5 );
	}
} );

// ---- Preis "ab …" und Knopf "Jetzt gestalten" in Produktlisten ----
add_filter( 'woocommerce_get_price_html', function ( $html, $product ) {
	if ( is_admin() || ! folieneditor_enabled( $product ) ) {
		return $html;
	}
	return 'ab ' . wc_price( wc_get_price_to_display( $product, [ 'price' => folieneditor_settings()['min'] ] ) );
}, 20, 2 );

add_filter( 'woocommerce_product_add_to_cart_url', fn( $url, $product ) => folieneditor_enabled( $product ) ? $product->get_permalink() : $url, 20, 2 );
add_filter( 'woocommerce_product_add_to_cart_text', fn( $text, $product ) => folieneditor_enabled( $product ) ? 'Jetzt gestalten' : $text, 20, 2 );
add_filter( 'woocommerce_product_supports', fn( $ok, $feature, $product ) => 'ajax_add_to_cart' === $feature && folieneditor_enabled( $product ) ? false : $ok, 20, 3 );
