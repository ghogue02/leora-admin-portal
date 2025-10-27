'use client';

import { ReactNode, useState, useCallback, CSSProperties } from 'react';
import Map, {
  NavigationControl,
  FullscreenControl,
  ScaleControl,
  GeolocateControl,
} from 'react-map-gl';
import type { ViewState, MapRef } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export interface MapboxMapProps {
  /** Mapbox access token (defaults to NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) */
  accessToken?: string;
  /** Initial viewport configuration */
  initialViewState?: Partial<ViewState>;
  /** Map style URL */
  mapStyle?: string;
  /** Children components (markers, layers, etc.) */
  children?: ReactNode;
  /** Show navigation controls */
  showNavigation?: boolean;
  /** Show fullscreen control */
  showFullscreen?: boolean;
  /** Show scale control */
  showScale?: boolean;
  /** Show geolocation control */
  showGeolocate?: boolean;
  /** Position of controls */
  controlsPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Callback when map is clicked */
  onClick?: (event: any) => void;
  /** Callback when map is moved */
  onMove?: (viewState: ViewState) => void;
  /** Callback when map is loaded */
  onLoad?: (event: { target: MapRef }) => void;
  /** Custom container style */
  style?: CSSProperties;
  /** Custom container className */
  className?: string;
  /** Interactive layer IDs for click handling */
  interactiveLayerIds?: string[];
}

const DEFAULT_VIEW_STATE: Partial<ViewState> = {
  longitude: -95.7129,
  latitude: 37.0902,
  zoom: 4,
  pitch: 0,
  bearing: 0,
};

const DEFAULT_MAP_STYLE = 'mapbox://styles/mapbox/streets-v12';

export default function MapboxMap({
  accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
  initialViewState = DEFAULT_VIEW_STATE,
  mapStyle = DEFAULT_MAP_STYLE,
  children,
  showNavigation = true,
  showFullscreen = true,
  showScale = true,
  showGeolocate = false,
  controlsPosition = 'top-right',
  onClick,
  onMove,
  onLoad,
  style = { width: '100%', height: '100%' },
  className,
  interactiveLayerIds,
}: MapboxMapProps) {
  const [viewState, setViewState] = useState<Partial<ViewState>>(initialViewState);

  const handleMove = useCallback(
    (evt: { viewState: ViewState }) => {
      setViewState(evt.viewState);
      onMove?.(evt.viewState);
    },
    [onMove]
  );

  if (!accessToken) {
    return (
      <div
        className={className}
        style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}
      >
        <div className="text-center px-4">
          <p className="text-lg font-semibold text-gray-700">Mapbox Token Missing</p>
          <p className="text-sm text-gray-500 mt-2">
            Add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to your environment variables
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      <Map
        {...viewState}
        onMove={handleMove}
        onClick={onClick}
        onLoad={onLoad}
        mapStyle={mapStyle}
        mapboxAccessToken={accessToken}
        style={{ width: '100%', height: '100%' }}
        interactiveLayerIds={interactiveLayerIds}
      >
        {/* Controls */}
        {showNavigation && <NavigationControl position={controlsPosition} />}
        {showFullscreen && <FullscreenControl position={controlsPosition} />}
        {showGeolocate && <GeolocateControl position={controlsPosition} />}
        {showScale && <ScaleControl position="bottom-right" />}

        {/* Children (markers, layers, etc.) */}
        {children}
      </Map>
    </div>
  );
}
