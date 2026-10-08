<?php
// Warenkorb: Gestaltung prüfen, Dateien speichern, Preis setzen, im Warenkorb anzeigen.

defined( 'ABSPATH' ) || exit;

const FOLIENEDITOR_FONTS = [
	'grundschrift' => 'Grundschrift',
	'andika'       => 'Andika',
	'playpen'      => 'Playpen',
	'nunito'       => 'Nunito',
	'comic'        => 'Comic Neue',
	'fredoka'      => 'Fredoka',
];
const FOLIENEDITOR_COLORS = [
	'#ffffff' => 'Weiß', '#1d1d1b' => 'Schwarz', '#8d8d8d' => 'Grau', '#d62828' => 'Rot',
	'#f28c28' => 'Orange', '#ffd23f' => 'Gelb', '#8cc63f' => 'Hellgrün', '#2e8b57' => 'Grün',
	'#1fb5ad' => 'Türkis', '#4fb3e8' => 'Hellblau', '#1f5fad' => 'Blau', '#7b4fa0' => 'Lila',
	'#e5579b' => 'Pink', '#8b5a2b' => 'Braun',
];
const FOLIENEDITOR_IMG_POS = [
	'left'  => 'links neben dem Text',
	'right' => 'rechts neben dem Text',
	'bg'    => 'als Hintergrund',
];

// Prüft die Gestaltung aus dem Browser. Gibt ein bereinigtes Array oder WP_Error zurück.
function folieneditor_parse_design( string $json ) {
	$d = json_decode( $json, true );
	if ( ! is_array( $d ) ) {
		return new WP_Error( 'folieneditor', 'Bitte die Folie im Editor gestalten und dort auf „In den Warenkorb“ klicken.' );
	}
	$s   = folieneditor_settings();
	$w   = round( (float) ( $d['wcm'] ?? 0 ), 1 );
	$h   = round( (float) ( $d['hcm'] ?? 0 ), 1 );
	$fmt = fn( $v ) => number_format_i18n( $v, floor( $v ) == $v ? 0 : 1 );
	if ( $w < $s['min_w'] || $w > $s['max_w'] ) {
		return new WP_Error( 'folieneditor', sprintf( 'Die Breite muss zwischen %s und %s cm liegen.', $fmt( $s['min_w'] ), $fmt( $s['max_w'] ) ) );
	}
	if ( $h < $s['min_h'] || $h > $s['max_h'] ) {
		return new WP_Error( 'folieneditor', sprintf( 'Die Höhe muss zwischen %s und %s cm liegen.', $fmt( $s['min_h'] ), $fmt( $s['max_h'] ) ) );
	}
	$text  = mb_substr( sanitize_textarea_field( (string) ( $d['text'] ?? '' ) ), 0, 300 );
	$font  = (string) ( $d['font'] ?? '' );
	$hex   = fn( $v ) => preg_match( '/^#[0-9a-f]{6}$/i', (string) $v ) ? strtolower( $v ) : '';
	$bg    = $hex( $d['bg'] ?? '' );
	$fg    = $hex( $d['fg'] ?? '' );
	$pos   = (string) ( $d['imgPos'] ?? '' );
	if ( ! isset( FOLIENEDITOR_FONTS[ $font ] ) || ! $bg || ! $fg || ( $pos && ! isset( FOLIENEDITOR_IMG_POS[ $pos ] ) ) ) {
		return new WP_Error( 'folieneditor', 'Die Gestaltung ist ungültig. Bitte die Seite neu laden und noch einmal versuchen.' );
	}
	if ( '' === trim( $text ) && ! $pos ) {
		return new WP_Error( 'folieneditor', 'Bitte einen Text eingeben oder ein Bild wählen.' );
	}
	return [
		'wcm'      => $w,
		'hcm'      => $h,
		'text'     => $text,
		'font'     => $font,
		'bg'       => $bg,
		'fg'       => $fg,
		'imgPos'   => $pos,
		'imgScale' => max( 10, min( 100, (int) ( $d['imgScale'] ?? 100 ) ) ),
	];
}

// Lesbare Zeilen für Warenkorb, Bestellung und E-Mails
function folieneditor_rows( array $d ): array {
	$cm    = fn( $v ) => number_format_i18n( $v, floor( $v ) == $v ? 0 : 1 );
	$color = fn( $hex ) => FOLIENEDITOR_COLORS[ $hex ] ?? strtoupper( $hex );
	$rows  = [
		'Größe'       => $cm( $d['wcm'] ) . ' × ' . $cm( $d['hcm'] ) . ' cm',
		'Text'        => '' === trim( $d['text'] ) ? '–' : $d['text'],
		'Schrift'     => FOLIENEDITOR_FONTS[ $d['font'] ],
		'Hintergrund' => $color( $d['bg'] ),
		'Textfarbe'   => $color( $d['fg'] ),
	];
	if ( $d['imgPos'] ) {
		$rows['Bild/Logo'] = FOLIENEDITOR_IMG_POS[ $d['imgPos'] ] . ( 'bg' !== $d['imgPos'] && $d['imgScale'] < 100 ? " ({$d['imgScale']} %)" : '' );
	}
	return $rows;
}

// ---- In den Warenkorb ----
// Prüfung und Datei-Upload passieren in der Validierung, damit Fehler als Hinweis
// erscheinen und nichts in den Warenkorb kommt. Das Ergebnis wird für den
// folgenden Filter woocommerce_add_cart_item_data zwischengespeichert.
$GLOBALS['folieneditor_pending'] = null;

add_filter( 'woocommerce_add_to_cart_validation', function ( $passed, $product_id ) {
	if ( ! $passed || ! folieneditor_enabled( $product_id ) ) {
		return $passed;
	}
	$design = folieneditor_parse_design( wp_unslash( (string) ( $_POST['folieneditor_design'] ?? '' ) ) ); // phpcs:ignore WordPress.Security.NonceVerification
	if ( is_wp_error( $design ) ) {
		wc_add_notice( $design->get_error_message(), 'error' );
		return false;
	}
	$pdf = folieneditor_store_upload( 'folieneditor_pdf', 'pdf' );
	if ( is_wp_error( $pdf ) ) {
		wc_add_notice( $pdf->get_error_message(), 'error' );
		return false;
	}
	$preview = folieneditor_store_upload( 'folieneditor_preview', 'png' );
	if ( is_wp_error( $preview ) ) {
		wp_delete_file( folieneditor_file_path( $pdf ) );
		wc_add_notice( $preview->get_error_message(), 'error' );
		return false;
	}
	$GLOBALS['folieneditor_pending'] = [
		'design'  => $design,
		'pdf'     => $pdf,
		'preview' => $preview,
		'price'   => folieneditor_price( $design['wcm'], $design['hcm'] ),
	];
	return true;
}, 20, 2 );

add_filter( 'woocommerce_add_cart_item_data', function ( $data, $product_id ) {
	if ( folieneditor_enabled( $product_id ) && $GLOBALS['folieneditor_pending'] ) {
		$data['folieneditor']            = $GLOBALS['folieneditor_pending'];   // eigene Datei = eigene Warenkorb-Position
		$GLOBALS['folieneditor_pending'] = null;
	}
	return $data;
}, 10, 2 );

// Nach dem Hinzufügen zum Warenkorb leiten, damit ein Neuladen nichts doppelt hinzufügt
add_filter( 'woocommerce_add_to_cart_redirect', function ( $url ) {
	return isset( $_POST['folieneditor_design'] ) ? wc_get_cart_url() : $url; // phpcs:ignore WordPress.Security.NonceVerification
} );

// ---- Preis ----
add_action( 'woocommerce_before_calculate_totals', function ( $cart ) {
	foreach ( $cart->get_cart() as $item ) {
		if ( ! empty( $item['folieneditor']['price'] ) ) {
			$item['data']->set_price( $item['folieneditor']['price'] );
		}
	}
}, 20 );

// ---- Anzeige im Warenkorb ----
add_filter( 'woocommerce_get_item_data', function ( $rows, $item ) {
	if ( empty( $item['folieneditor']['design'] ) ) {
		return $rows;
	}
	foreach ( folieneditor_rows( $item['folieneditor']['design'] ) as $key => $value ) {
		$rows[] = [ 'key' => $key, 'value' => $value ];
	}
	return $rows;
}, 10, 2 );

add_filter( 'woocommerce_cart_item_thumbnail', function ( $html, $item ) {
	if ( empty( $item['folieneditor']['preview'] ) ) {
		return $html;
	}
	return '<img src="' . esc_url( folieneditor_file_url( $item['folieneditor']['preview'] ) ) . '" alt="Vorschau der Folie" class="folieneditor-thumb" style="width:100%;height:auto;object-fit:contain;border:1px solid #ddd" />';
}, 10, 2 );

// Warenkorb-/Kassen-Block (Store API)
add_filter( 'woocommerce_store_api_cart_item_images', function ( $images, $item ) {
	if ( empty( $item['folieneditor']['preview'] ) ) {
		return $images;
	}
	$url = folieneditor_file_url( $item['folieneditor']['preview'] );
	return [ (object) [ 'id' => 0, 'src' => $url, 'thumbnail' => $url, 'srcset' => '', 'sizes' => '', 'name' => 'Vorschau', 'alt' => 'Vorschau der Folie' ] ];
}, 10, 2 );

// Positionen ohne Druckdatei (z. B. nach dem Aufräumen) nicht bestellen lassen
add_action( 'woocommerce_check_cart_items', function () {
	foreach ( WC()->cart->get_cart() as $key => $item ) {
		if ( empty( $item['folieneditor'] ) ) {
			continue;
		}
		$pdf = folieneditor_file_path( (string) ( $item['folieneditor']['pdf'] ?? '' ) );
		if ( ! $pdf || ! file_exists( $pdf ) ) {
			WC()->cart->remove_cart_item( $key );
			wc_add_notice( 'Eine gestaltete Folie war zu lange im Warenkorb und wurde entfernt. Bitte neu gestalten.', 'error' );
		}
	}
} );
