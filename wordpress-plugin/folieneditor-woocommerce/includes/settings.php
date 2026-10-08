<?php
// Einstellungen unter WooCommerce → Einstellungen → Produkte → Folieneditor
// und die Preisformel, die auch der Editor im Browser verwendet (src/shop.js).

defined( 'ABSPATH' ) || exit;

function folieneditor_settings(): array {
	$num = function ( $key, $default ) {
		$v = get_option( $key, '' );
		return '' === $v || ! is_numeric( $v ) ? (float) $default : (float) $v;
	};
	return [
		'base'      => $num( 'folieneditor_price_base', 0 ),
		'per_m2'    => $num( 'folieneditor_price_m2', 60 ),
		'min'       => $num( 'folieneditor_price_min', 19 ),
		'min_w'     => $num( 'folieneditor_min_w', 5 ),
		'max_w'     => $num( 'folieneditor_max_w', 200 ),
		'min_h'     => $num( 'folieneditor_min_h', 2 ),
		'max_h'     => $num( 'folieneditor_max_h', 15 ),
		'upload_mb' => $num( 'folieneditor_upload_mb', 20 ),
	];
}

// Stückpreis: Grundpreis + Fläche (m²) × m²-Preis, mindestens der Mindestpreis.
function folieneditor_price( float $wcm, float $hcm ): float {
	$s = folieneditor_settings();
	$p = $s['base'] + ( $wcm * $hcm / 10000 ) * $s['per_m2'];
	return round( max( $s['min'], $p ), 2 );
}

// Höchste Uploadgröße in Bytes: eigene Einstellung, aber nie mehr als der Server erlaubt
function folieneditor_max_upload(): int {
	$s = folieneditor_settings();
	return (int) min( $s['upload_mb'] * MB_IN_BYTES, wp_max_upload_size() );
}

add_filter( 'woocommerce_get_sections_products', function ( $sections ) {
	$sections['folieneditor'] = 'Folieneditor';
	return $sections;
} );

add_filter( 'woocommerce_get_settings_products', function ( $settings, $section ) {
	if ( 'folieneditor' !== $section ) {
		return $settings;
	}
	$money = [ 'min' => '0', 'step' => '0.01' ];
	$cm    = [ 'min' => '1', 'step' => '0.1' ];
	$cur   = get_woocommerce_currency_symbol();
	$tax   = wc_prices_include_tax() ? 'inkl. MwSt.' : 'zzgl. MwSt.';
	return [
		[
			'title' => 'Folieneditor: Preis',
			'type'  => 'title',
			'desc'  => "Stückpreis = Grundpreis + Fläche in m² × Preis pro m², mindestens der Mindestpreis. Beträge {$tax}, wie im Shop eingestellt. "
				. 'Der Editor wird pro Produkt eingeschaltet (Produkt bearbeiten → Allgemein → „Folieneditor“).',
			'id'    => 'folieneditor_price',
		],
		[ 'title' => "Grundpreis ({$cur})", 'id' => 'folieneditor_price_base', 'type' => 'number', 'default' => '0', 'custom_attributes' => $money, 'desc_tip' => 'Fester Betrag pro Folie, z. B. für Einrichtung.' ],
		[ 'title' => "Preis pro m² ({$cur})", 'id' => 'folieneditor_price_m2', 'type' => 'number', 'default' => '60', 'custom_attributes' => $money ],
		[ 'title' => "Mindestpreis ({$cur})", 'id' => 'folieneditor_price_min', 'type' => 'number', 'default' => '19', 'custom_attributes' => $money, 'desc_tip' => 'Kleinste Folien kosten mindestens diesen Betrag.' ],
		[ 'type' => 'sectionend', 'id' => 'folieneditor_price' ],
		[
			'title' => 'Folieneditor: Maße und Upload',
			'type'  => 'title',
			'desc'  => 'Erlaubte Größe des Endformats. Gedruckt wird zusätzlich mit 2 mm Beschnitt je Seite.',
			'id'    => 'folieneditor_limits',
		],
		[ 'title' => 'Breite mindestens (cm)', 'id' => 'folieneditor_min_w', 'type' => 'number', 'default' => '5', 'custom_attributes' => $cm ],
		[ 'title' => 'Breite höchstens (cm)', 'id' => 'folieneditor_max_w', 'type' => 'number', 'default' => '200', 'custom_attributes' => $cm ],
		[ 'title' => 'Höhe mindestens (cm)', 'id' => 'folieneditor_min_h', 'type' => 'number', 'default' => '2', 'custom_attributes' => $cm ],
		[ 'title' => 'Höhe höchstens (cm)', 'id' => 'folieneditor_max_h', 'type' => 'number', 'default' => '15', 'custom_attributes' => $cm ],
		[
			'title'             => 'Druckdatei höchstens (MB)',
			'id'                => 'folieneditor_upload_mb',
			'type'              => 'number',
			'default'           => '20',
			'custom_attributes' => [ 'min' => '1', 'step' => '1' ],
			'desc'              => sprintf( 'Der Server erlaubt derzeit %s MB pro Upload.', number_format_i18n( wp_max_upload_size() / MB_IN_BYTES, 1 ) ),
		],
		[ 'type' => 'sectionend', 'id' => 'folieneditor_limits' ],
	];
}, 10, 2 );
